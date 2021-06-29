#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

addTrapCommand() {
    local command=$1
    local signal=$2

    # Adds new trap command to the existing trap code, separated by a newline
    trap -- "$(
        getTrapCommand() { printf '%s\n' "$3"; }
        eval "getTrapCommand $(trap -p "${signal}")"
        printf '%s\n' "${command}"
    )" "${signal}"

    echo "New trap code:"
    trap -p EXIT
}
