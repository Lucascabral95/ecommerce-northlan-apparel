variable "name_prefix" {
  description = "Prefix used for secret names."
  type        = string
}

variable "secret_names" {
  description = "Secret short names to create."
  type        = set(string)
}

variable "secret_values" {
  description = "Optional initial secret values keyed by short secret name. Values are stored in Terraform state."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
