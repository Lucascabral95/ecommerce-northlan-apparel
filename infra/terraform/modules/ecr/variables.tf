variable "repositories" {
  description = "ECR repository names to create."
  type        = set(string)
}

variable "image_retention_count" {
  description = "Number of tagged images to keep per repository."
  type        = number
  default     = 10
}

variable "lifecycle_tag_prefixes" {
  description = "Tag prefixes covered by the tagged image lifecycle rule."
  type        = list(string)
  default     = ["latest", "dev", "prod", "v", "sha-"]
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}
