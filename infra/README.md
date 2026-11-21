# Hospedagem na AWS (S3 + CloudFront)

`aldoria-site.yml` (CloudFormation) cria: bucket S3 privado, CloudFront com HTTPS (acesso ao bucket por OAC) e uma role IAM que o GitHub Actions assume por OIDC (sem chaves guardadas), limitada a este repositório e à branch `main`.

## 1. Criar a infra (uma vez)
```
aws cloudformation deploy --template-file infra/aldoria-site.yml --stack-name aldoria-site \
  --capabilities CAPABILITY_IAM --region us-east-1 [--profile <perfil>]
```
- Se a conta **já tem** o provedor OIDC do GitHub (`token.actions.githubusercontent.com`), adicione `--parameter-overrides OidcProviderArn=arn:aws:iam::<conta>:oidc-provider/token.actions.githubusercontent.com`. Só pode haver um por conta; sem isso o stack falha.
- Outros parâmetros: `GitHubRepo` (padrão `dannielvroque/Aldoria`) e `GitHubBranch` (padrão `main`).

Ler as saídas:
```
aws cloudformation describe-stacks --stack-name aldoria-site --query "Stacks[0].Outputs" --output table
```

## 2. Variáveis do GitHub
Em Settings > Secrets and variables > Actions > **Variables**, crie: `AWS_ROLE_ARN` (DeployRoleArn), `AWS_REGION`, `S3_BUCKET` (BucketName) e `CF_DISTRIBUTION_ID` (DistributionId). Não são segredos.

## 3. Deploy
- Automático: push na `main` que mude `src/**` ou `build.py` (`.github/workflows/deploy.yml`), ou rode o workflow à mão (Actions > Deploy > Run workflow).
- Local: `python tools/deploy_s3.py <BucketName> <DistributionId>` (usa suas credenciais do AWS CLI).
- A URL é a saída `SiteUrl` (`https://dxxxx.cloudfront.net`).

## Observações
- O administrador (Ctrl+Shift+F10) vai junto no HTML publicado; a senha só evita abertura acidental.
- Saves ficam no `localStorage` de cada origem: o da URL do CloudFront não é o do `file://`. Use Exportar/Importar do administrador para levar o save.
- Para remover tudo: esvazie o bucket e rode `aws cloudformation delete-stack --stack-name aldoria-site`.
