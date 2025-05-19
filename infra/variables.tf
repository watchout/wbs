variable "auth_url" {
  description = "OpenStack authentication URL"
  type        = string
}

variable "tenant_name" {
  description = "OpenStack tenant/project name"
  type        = string
}

variable "user_name" {
  description = "OpenStack username"
  type        = string
}

variable "password" {
  description = "User password"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "OpenStack region"
  type        = string
  default     = "tyo1"
}

variable "image_name" {
  description = "Base image name"
  type        = string
  default     = "Ubuntu 22.04"
}

variable "flavor_name" {
  description = "Instance flavor"
  type        = string
  default     = "g1.small"
}

variable "network_name" {
  description = "Network name for the instance"
  type        = string
}
