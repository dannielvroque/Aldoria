output "site_url" {
  value = "https://${aws_cloudfront_distribution.site.domain_name}"
}

# Valores das variáveis do GitHub Actions (Settings > Secrets and variables > Actions > Variables)
output "AWS_ROLE_ARN" {
  value = aws_iam_role.deploy.arn
}

output "AWS_REGION" {
  value = var.region
}

output "S3_BUCKET" {
  value = aws_s3_bucket.site.bucket
}

output "CF_DISTRIBUTION_ID" {
  value = aws_cloudfront_distribution.site.id
}

# Valores do save na nuvem: salve como cloud.json na raiz do repositorio (ver infra/README.md)
output "cloud_json" {
  value = jsonencode({
    api    = aws_apigatewayv2_api.save.api_endpoint
    cid    = aws_cognito_user_pool_client.web.id
    region = var.region
  })
}
