# Ids of accounts made by hand (not secrets): the Atlas organization and the Cloudflare account
# and zone. Given in infra/.env as TF_VAR_*.
variable "atlas_org_id" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

# puny-chat.com, bought through Cloudflare Registrar, so the zone is there already.
variable "cloudflare_zone_id" {
  type = string
}

# The web app (a Cloudflare Worker with static assets, deployed by CI with wrangler: app/wrangler.jsonc)
# and the server, on the same domain.
variable "web_domain" {
  type    = string
  default = "puny-chat.com"
}

variable "api_subdomain" {
  type    = string
  default = "api"
}

# Sydney, next to the Lightsail instance, so every query stays local. M0 is offered there.
variable "atlas_region" {
  type    = string
  default = "AP_SOUTHEAST_2"
}

# The Lightsail instance's static IP (ap-southeast-2), where api.<domain> points.
variable "server_ip" {
  type    = string
  default = "54.79.210.198"
}
