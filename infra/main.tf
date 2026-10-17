# puny-chat's infrastructure (docs/PROJECT.md, 인프라): MongoDB on Atlas and DNS on
# Cloudflare. The server runs on a shared Lightsail instance (server/deploy), which Terraform does
# not manage. The web app is a Cloudflare Worker deployed by CI with wrangler; its
# custom domain comes with that deploy (app/wrangler.jsonc).

locals {
  api_domain = "${var.api_subdomain}.${trimsuffix(data.cloudflare_zone.site.name, ".")}"
}

data "cloudflare_zone" "site" {
  zone_id = var.cloudflare_zone_id
}

# --- Database: MongoDB Atlas, free M0 ---

resource "mongodbatlas_project" "this" {
  name   = "puny-chat"
  org_id = var.atlas_org_id
}

resource "mongodbatlas_advanced_cluster" "db" {
  project_id   = mongodbatlas_project.this.id
  name         = "puny-chat"
  cluster_type = "REPLICASET"

  replication_specs = [
    {
      region_configs = [
        {
          electable_specs = {
            instance_size = "M0"
          }
          provider_name         = "TENANT"
          backing_provider_name = "AWS"
          region_name           = var.atlas_region
          priority              = 7
        }
      ]
    }
  ]
}

resource "random_password" "db" {
  length  = 32
  special = false # goes into a connection string
}

resource "mongodbatlas_database_user" "server" {
  project_id         = mongodbatlas_project.this.id
  username           = "buddychat"
  password           = random_password.db.result
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "buddychat"
  }
}

# Only the Lightsail instance (its static IP) may connect; the password and TLS protect it as well.
resource "mongodbatlas_project_ip_access_list" "server" {
  project_id = mongodbatlas_project.this.id
  cidr_block = "${var.server_ip}/32"
  comment    = "Lightsail quant-lab-02"
}

moved {
  from = mongodbatlas_project_ip_access_list.anywhere
  to   = mongodbatlas_project_ip_access_list.server
}

locals {
  db_host     = trimprefix(mongodbatlas_advanced_cluster.db.connection_strings.standard_srv, "mongodb+srv://")
  mongodb_uri = "mongodb+srv://buddychat:${random_password.db.result}@${local.db_host}/?retryWrites=true&w=majority&appName=puny-chat"
}

# --- Web Push: this server's VAPID key (RFC 8292), kept in the state like the database password.
# Replacing it only makes browsers subscribe again the next time the app opens.

resource "tls_private_key" "vapid" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

# The server runs on the Lightsail instance (server/deploy). Caddy there gets its own certificate,
# and Cloudflare only answers DNS for it (not proxied), so WebSockets go straight to the instance.
resource "cloudflare_dns_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = var.api_subdomain
  type    = "A"
  content = var.server_ip
  proxied = false
  ttl     = 60
}
