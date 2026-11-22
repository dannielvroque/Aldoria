# Hospedagem na AWS (Terraform)

Cria: bucket S3 privado (criptografado, sem acesso público), policy do bucket (leitura só pela distribuição), CloudFront com HTTPS (acesso por OAC) e uma role IAM que o GitHub Actions assume por OIDC (sem chaves guardadas), limitada a este repositório e à branch `main`. O workflow `.github/workflows/deploy.yml` faz o deploy.

## 1. Criar a infra (uma vez)
```
cd infra
terraform init
terraform apply -var aws_profile=<perfil>        # confira o plano antes de confirmar
```
- Se a conta **já tem** o provedor OIDC do GitHub (`token.actions.githubusercontent.com`; só pode haver um por conta), acrescente `-var github_oidc_provider_arn=arn:aws:iam::<conta>:oidc-provider/token.actions.githubusercontent.com`; sem isso o apply falha.
- Outras variáveis (`variables.tf`): `region` (padrão `us-east-1`), `github_repo`, `github_branch`.
- O estado (`terraform.tfstate`) fica local e fora do git. Guarde-o: sem ele o Terraform não gerencia mais os recursos.

## 2. Variáveis do GitHub
`terraform output` mostra os 4 valores. Em Settings > Secrets and variables > Actions > **Variables** crie `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET` e `CF_DISTRIBUTION_ID` (não são segredos).

## 3. Deploy
- Automático: push na `main` que mude `src/**` ou `build.py`, ou Actions > Deploy > Run workflow.
- Local: `python tools/deploy_s3.py <S3_BUCKET> <CF_DISTRIBUTION_ID>`.
- URL: saída `site_url` (`https://dxxxx.cloudfront.net`).

## Observações
- O administrador (Ctrl+Shift+F10) vai junto no HTML publicado; a senha só evita abertura acidental.
- Saves ficam no `localStorage` de cada origem: o da URL do CloudFront não é o do `file://`. Use Exportar/Importar do administrador.
- Remover tudo: `terraform destroy` (o bucket tem `force_destroy`, então é esvaziado junto).
