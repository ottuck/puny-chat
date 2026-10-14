output "server_url" {
  value = "https://${local.api_domain}"
}

output "web_url" {
  value = "https://${var.web_domain}"
}

# For the server's env file on the instance: terraform output -raw mongodb_uri
output "mongodb_uri" {
  value     = local.mongodb_uri
  sensitive = true
}

output "railway_project_id" {
  value = railway_project.this.id
}

output "railway_service_id" {
  value = railway_service.server.id
}
