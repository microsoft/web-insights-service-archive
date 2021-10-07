#!/usr/bin/env bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

function waitForProcesses() {
    # accepting an associative array as a string
    arg1=$(declare -p "$1")
    # converting string into a new associative array
    eval "declare -A processesToWaitFor=${arg1#*=}"

    # shellcheck disable=SC2154
    for pid in "${!processesToWaitFor[@]}"; do
        echo "Waiting for process with pid ${pid}. Command: ${processesToWaitFor[${pid}]}"

        wait "${pid}"

        local processExitCode=$?
        if [[ ${processExitCode} == 0 ]]; then
            echo "Process with pid ${pid} exited. Exit code: ${processExitCode}. Command: ${processesToWaitFor[${pid}]}"
        else
            echo "Process with pid ${pid} exited with non-zero code. Exiting current process. Exit code: ${processExitCode}. Command: ${processesToWaitFor[${pid}]}"
            exit "${processExitCode}"
        fi
    done
}

function waitForCommandsInParallel {
    local commands=$1

    declare -A parallelizableProcesses

    local list="${commands}[@]"
    for command in "${!list}"; do
        eval "${command}" &
        echo "Created process with pid $!. Command: ${command}"
        # shellcheck disable=SC2034
        parallelizableProcesses[$!]="${command}"
    done

    waitForProcesses "parallelizableProcesses"
}

function sendSignalToProcessIfExists {
    local currentPid=$1
    local signal=$2

    if [[ -z ${currentPid} ]]; then
        return
    fi

    if kill -0 "${currentPid}" >/dev/null 2>&1; then
        kill "${signal}" "${currentPid}"
    fi
}

function killWithDescendantsIfProcessExists() {
    local currentPid=$1

    if [[ -z ${currentPid} ]]; then
        return
    fi

    if kill -0 "${currentPid}" >/dev/null 2>&1; then
        echo "Stopping process ${currentPid}"
        sendSignalToProcessIfExists "${currentPid}" -SIGSTOP

        killDescendantProcesses "${currentPid}"
        echo "Killed descendant processes of ${currentPid}"

        sendSignalToProcessIfExists "${currentPid}" -SIGKILL
        echo "Killed process ${currentPid}"
    fi
}

function killDescendantProcesses() {
    local processId=$1
    local children

    children=$(pgrep -P "${processId}")
    for childPid in ${children}; do
        killWithDescendantsIfProcessExists "${childPid}"
    done
}
