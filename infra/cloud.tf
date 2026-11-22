# ---------- Save na nuvem: Cognito (login) + API Gateway + Lambda + S3 (prefixo saves/) ----------
# O jogo continua 100% offline sem login; com login, cada conta guarda um save em saves/<sub>.json.
# O CloudFront só serve index.html (ver a policy do bucket), então saves/ nunca fica público.

# ---- versionamento: protege o save de uma gravação ruim (versões antigas expiram em 30 dias) ----
resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  bucket     = aws_s3_bucket.site.id
  depends_on = [aws_s3_bucket_versioning.site]
  rule {
    id     = "expira-versoes-antigas"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ---- Cognito ----
resource "aws_cognito_user_pool" "jogo" {
  name                     = "aldoria-jogadores"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_uppercase = false
    require_symbols   = false
  }
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Aldoria: seu código de verificação"
    email_message        = "Seu código de verificação do Aldoria é {####}"
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name                          = "aldoria-web"
  user_pool_id                  = aws_cognito_user_pool.jogo.id
  generate_secret               = false
  explicit_auth_flows           = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  refresh_token_validity        = 365
  id_token_validity             = 60
  access_token_validity         = 60
  token_validity_units {
    refresh_token = "days"
    id_token      = "minutes"
    access_token  = "minutes"
  }
}

# ---- Lambda ----
data "archive_file" "save" {
  type        = "zip"
  source_file = "${path.module}/lambda/save.mjs"
  output_path = "${path.module}/.build/save.zip"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "save" {
  name_prefix        = "aldoria-save-"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "save_logs" {
  role       = aws_iam_role.save.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "save_s3" {
  statement {
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.site.arn}/saves/*"]
  }
}

resource "aws_iam_role_policy" "save_s3" {
  name   = "saves-s3"
  role   = aws_iam_role.save.id
  policy = data.aws_iam_policy_document.save_s3.json
}

resource "aws_lambda_function" "save" {
  function_name    = "aldoria-save"
  role             = aws_iam_role.save.arn
  runtime          = "nodejs20.x"
  handler          = "save.handler"
  filename         = data.archive_file.save.output_path
  source_code_hash = data.archive_file.save.output_base64sha256
  memory_size      = 256
  timeout          = 10
  environment {
    variables = {
      BUCKET = aws_s3_bucket.site.bucket
    }
  }
}

# ---- API Gateway (HTTP API) com autorizador JWT do Cognito ----
resource "aws_apigatewayv2_api" "save" {
  name          = "aldoria-save"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"] # autenticação por Bearer (sem cookies): não há risco de CSRF
    allow_methods = ["GET", "PUT", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.save.id
  name             = "cognito"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.jogo.id}"
  }
}

resource "aws_apigatewayv2_integration" "save" {
  api_id                 = aws_apigatewayv2_api.save.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.save.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "save" {
  for_each           = toset(["GET /save", "PUT /save"])
  api_id             = aws_apigatewayv2_api.save.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.save.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.save.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.save.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.save.execution_arn}/*/*"
}
