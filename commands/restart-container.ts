/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { RootNode } from '../explorer/models/rootNode';
import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

export async function restartContainer(actionContext: IActionContext, context: RootNode | ContainerNode | undefined): Promise<void> {

    let containersToRestart: Docker.ContainerDesc[];

    if (context instanceof ContainerNode && context.containerDesc) {
        containersToRestart = [context.containerDesc];
    } else {
        const opts = {
            "filters": {
                "status": ["running", "paused", "exited"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(actionContext, true, opts);
        if (selectedItem) {
            if (selectedItem.allContainers) {
                containersToRestart = await docker.getContainerDescriptors(opts);
            } else {
                containersToRestart = [selectedItem.containerDesc];
            }
        }
    }

    if (containersToRestart) {

        const numContainers: number = containersToRestart.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Restarting Container(s)...", new Promise((resolve, reject) => {
            containersToRestart.forEach((container) => {
                // tslint:disable-next-line:no-any
                docker.getContainer(container.Id).restart((err: Error, _data: any) => {
                    containerCounter++;
                    if (err) {
                        vscode.window.showErrorMessage(err.message);
                        dockerExplorerProvider.refreshContainers();
                        reject();
                    }
                    if (containerCounter === numContainers) {
                        dockerExplorerProvider.refreshContainers();
                        resolve();
                    }
                });
            });
        }));
    }
}
