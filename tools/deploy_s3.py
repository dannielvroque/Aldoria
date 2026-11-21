"""Publica o jogo (dist/aldoria.html) num bucket S3 para testar pela web.
Faz o build, envia como index.html com o Content-Type certo e, se houver CloudFront, invalida o cache.

Requisitos: AWS CLI instalado e configurado (aws configure) com permissão no bucket.
Uso:   python tools/deploy_s3.py <bucket> [id-da-distribuicao-cloudfront]
   ou: defina ALDORIA_BUCKET e (opcional) ALDORIA_CF_ID e rode  python tools/deploy_s3.py
Opções por ambiente: AWS_PROFILE e AWS_REGION valem como no AWS CLI. Use --dry-run para só mostrar os comandos."""
import os, subprocess, sys, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
DRY = '--dry-run' in sys.argv
bucket = args[0] if args else os.environ.get('ALDORIA_BUCKET')
cf = args[1] if len(args) > 1 else os.environ.get('ALDORIA_CF_ID')
if not bucket:
    sys.exit(__doc__)
if not DRY and not shutil.which('aws'):
    sys.exit('AWS CLI não encontrado. Instale em https://aws.amazon.com/cli/ e rode "aws configure".')

def run(cmd):
    print('>', ' '.join(cmd))
    if not DRY:
        subprocess.run(cmd, check=True)

run([sys.executable, os.path.join(ROOT, 'build.py')])
html = os.path.join(ROOT, 'dist', 'aldoria.html')
# cache curto: o arquivo é único e muda a cada deploy
run(['aws', 's3', 'cp', html, 's3://%s/index.html' % bucket,
     '--content-type', 'text/html; charset=utf-8', '--cache-control', 'no-cache'])
if cf:
    run(['aws', 'cloudfront', 'create-invalidation', '--distribution-id', cf, '--paths', '/index.html', '/'])
print('Pronto.' if not DRY else 'Simulação concluída (nada foi enviado).')
