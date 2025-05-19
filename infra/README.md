# Infrastructure

This directory contains a minimal Terraform example for provisioning a ConoHa VPS and an object storage container.

```bash
# Initialize and apply
terraform init
terraform apply -auto-approve \
  -var auth_url=... \
  -var tenant_name=... \
  -var user_name=... \
  -var password=... \
  -var network_name=... 
```

Terraform outputs the public IP address as `vps_ip`.
