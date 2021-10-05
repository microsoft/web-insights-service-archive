# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:3.0-node12-appservice
FROM mcr.microsoft.com/azure-functions/node:3.0-node12

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

RUN apt-get update && curl -sL https://aka.ms/InstallAzureCLIDeb | bash

COPY . /home/site/wwwroot

RUN cd /home/site/wwwroot 

EXPOSE 80
