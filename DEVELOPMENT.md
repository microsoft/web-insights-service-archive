<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

Before you start, make sure you have the Owner permission, or Contributor with User Access Administrator permission for the subscription. To learn more about how to give role based access, check [Manage access to Azure resources using RBAC and the Azure portal](https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal)

# Prerequisites

The build machine should have the following installed

1. Azure CLI https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest

    When installing Azure CLI for [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/about) select a corresponding Linux distribution used with WSL

2. Helm CLI https://helm.sh/docs/intro/install/

3. Docker https://docs.docker.com/get-docker/

4. Node.js v12 https://nodejs.org/en/blog/release/v12.22.1/

5. Yarn https://classic.yarnpkg.com/en/docs/install

6. Azure Functions Core Tools https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local

7. Postman https://www.postman.com/downloads/

# Build

### 1. Clone the GitHub repository

Clone the repository using the following command

```bash
git clone https://github.com/microsoft/web-insights-service.git
```

### 2. Build service

-   Select the source root directory

    ```bash
    cd web-insights-service
    ```

-   Run build command from the source root directory
    ```bash
    yarn cbuild
    ```

# Deploy

The deployment script is going to create or update all required Azure resources

### 1. Login to Azure subscription account

Login to Azure account and set the current active subscription

```bash
az login
az account set --subscription <Name or ID of subscription>
```

### 2. Deploy

Run below script with required parameters as specified in a install.sh script's help to deploy Azure resources and binaries

```bash
web-insights-service/packages/resource-deployment/scripts/install.sh
```

# Service APIs Test Access

### 1. Register an application

Register an application for the service APIs. Follow this [sample guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app) to register an application in Azure portal.

When registering an application:

-   Set the **Application ID URI** property
-   Do not set the **Redirect URI** property
-   Do not add application credentials

### 2. Create client application

Create client application in Azure AD to access service APIs for test purposes. Follow this [sample guide](https://docs.microsoft.com/en-us/azure/healthcare-apis/azure-api-for-fhir/register-confidential-azure-ad-client-app) to create **client application** and **client secret** in Azure portal

When creating client application:

-   Add a client secret
-   Do not the **Application ID URI** property
-   Do not set the **Redirect URI** property

### 3. Grant access to client application

Update the key vault secret value for the corresponding ACL name. The secret value should be conform to the following JSON document format:

```json
{
    "audience": "<Service's Application ID URI>",
    "appIds": ["<Client's Application (client) ID>"]
}
```

### 3. Access Service APIs

Use Postman templates or build HTTP GET request to create OAuth 2.0 access token as described in [Microsoft identity platform and the OAuth 2.0 client credentials flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow) to access service APIs
