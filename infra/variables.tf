variable "region" {
  description = "Região da AWS do bucket"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Perfil do AWS CLI (null = credenciais padrão do ambiente)"
  type        = string
  default     = null
}

variable "github_repo" {
  description = "Repositório (dono/nome) autorizado a fazer deploy"
  type        = string
  default     = "dannielvroque/Aldoria"
}

variable "github_sub_prefix" {
  description = "Prefixo do claim sub do OIDC com subject imutável do repositório (owner@id/repo@id). Vazio = só o formato antigo (dono/nome)."
  type        = string
  default     = "repo:dannielvroque@64965383/Aldoria@1465637911"
}

variable "github_branch" {
  description = "Única branch autorizada a assumir a role de deploy"
  type        = string
  default     = "main"
}

variable "github_oidc_provider_arn" {
  description = "ARN do provedor OIDC do GitHub, se a conta já tiver um. Vazio = cria um novo."
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "E-mail que recebe os alertas do orçamento da AWS"
  type        = string
}

variable "budget_usd" {
  description = "Limite mensal do orçamento, em dólares"
  type        = number
  default     = 5
}
