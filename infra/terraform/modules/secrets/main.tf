locals {
  populated_secret_values = {
    for key, value in nonsensitive(var.secret_values) : key => value
    if trimspace(value) != ""
  }
}

resource "aws_secretsmanager_secret" "this" {
  for_each = var.secret_names

  name                    = "${var.name_prefix}/${each.value}"
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.name_prefix}/${each.value}"
  })
}

resource "aws_secretsmanager_secret_version" "this" {
  for_each = local.populated_secret_values

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = each.value
}
