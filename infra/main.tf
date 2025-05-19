terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = ">= 1.52.1"
    }
  }
}

provider "openstack" {
  auth_url    = var.auth_url
  tenant_name = var.tenant_name
  user_name   = var.user_name
  password    = var.password
  region      = var.region
}

resource "openstack_compute_instance_v2" "vps" {
  name        = "wbs-vps"
  image_name  = var.image_name
  flavor_name = var.flavor_name

  network {
    name = var.network_name
  }
}

resource "openstack_objectstorage_container_v1" "data" {
  name = "wbs-data"
}

output "vps_ip" {
  value = openstack_compute_instance_v2.vps.access_ip_v4
}
