from trainer.api_client.client import AuthenticatedClient
import os

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token=""
)

if os.environ.get("DOCKER_SECRET"):
    configured_client.token = os.environ["DOCKER_SECRET"]

if os.environ.get("OPENPIPE_BASE_URL"):
    configured_client._base_url = os.environ["OPENPIPE_BASE_URL"]