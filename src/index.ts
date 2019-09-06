// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { WidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import { IStateDB } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { Debugger } from './debugger';

// import { DebuggerSidebar } from './sidebar';

import { IDebugger, IDebuggerSidebar } from './tokens';

// import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { Session } from '@jupyterlab/services';

// import { DebugSession } from './session';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
  export const create = 'debugger:create';

  export const debugConsole = 'debugger:debug-console';

  export const debugFile = 'debugger:debug-file';

  export const debugNotebook = 'debugger:debug-notebook';
}

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:consoles',
  autoStart: true,
  requires: [IDebugger],
  optional: [IConsoleTracker],
  activate: (_, debug, tracker: IConsoleTracker | null) => {
    if (!tracker) {
      console.log(`${consoles.id} load failed. There is no console tracker.`);
      return;
    }
    console.log(`${consoles.id} has not been implemented.`, debug);
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:files',
  autoStart: true,
  optional: [IEditorTracker],
  activate: (app: JupyterFrontEnd, tracker: IEditorTracker | null) => {
    app.commands.addCommand(CommandIDs.debugFile, {
      execute: async _ => {
        if (!tracker || !tracker.currentWidget) {
          return;
        }
        if (tracker.currentWidget) {
          // TODO: Find if the file is backed by a kernel or attach it to one.
          const widget = await app.commands.execute(CommandIDs.create);
          app.shell.add(widget, 'main');
        }
      }
    });
  }
};

/**
 * A plugin that provides visual debugging support for notebooks.
 */
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:notebooks',
  autoStart: true,
  requires: [IDebugger],
  optional: [INotebookTracker, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    debug,
    tracker: INotebookTracker,
    palette: ICommandPalette
  ) => {
    Session.listRunning().then(sessionModels => {
      console.log(sessionModels);
      // const session = Session.connectTo(sessionModels[0]);

      // session.shutdown();
    });
    // console.log(client);
    // if (false) {
    // const test = async () => {

    //   await (client as ClientSession).initialize();
    //   await client.kernel.ready;
    // };
    // const debugSession = new DebugSession({ client });
    // console.log(debugSession, test);
    // }

    const command: string = CommandIDs.debugNotebook;
    app.commands.addCommand(command, {
      label: 'A',
      execute: () => {
        let options = {
          kernelName: 'python',
          path: '/tmp/foo.ipynb',
          name: 'foo.ipynb'
        };
        Session.startNew(options).then(session => {
          // Execute and handle replies on the kernel.
          let future = session.kernel.requestExecute({ code: 'a = 1' });
          future.done.then(res => {
            console.log('Future is fulfilled', res);
          });
        });
      }
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'A' });
  }
};

/**
 * A plugin providing a condensed sidebar UI for debugging.
 */
const sidebar: JupyterFrontEndPlugin<Debugger> = {
  id: '@jupyterlab/debugger:sidebar',
  optional: [ILayoutRestorer, INotebookTracker, IEditorTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer | null,
    notebookTracker: INotebookTracker
  ): Debugger => {
    const { shell } = app;
    const label = 'Environment';
    const namespace = 'jp-debugger-sidebar';
    const sidebar = new Debugger({
      notebook: notebookTracker
    });

    sidebar.id = namespace;
    sidebar.title.label = label;
    shell.add(sidebar, 'right', { activate: false });

    if (restorer) {
      restorer.add(sidebar, sidebar.id);
    }

    return sidebar;
  }
};

/**
 * A plugin providing a tracker code debuggers.
 */
const tracker: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:tracker',
  optional: [ILayoutRestorer, IDebuggerSidebar, INotebookTracker],
  requires: [IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer: ILayoutRestorer | null,
    sidebar: IDebuggerSidebar | null
  ): IDebugger => {
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    app.commands.addCommand(CommandIDs.create, {
      execute: args => {
        const id = (args.id as string) || '';
        console.log(id, 'hi');
        if (id) {
          console.log('Debugger ID: ', id);
        }

        if (tracker.find(widget => id === widget.content.model.id)) {
          return;
        }

        const widget = new MainAreaWidget({
          content: new Debugger({
            connector: state,
            id: id
          })
        });

        void tracker.add(widget);

        return widget;
      }
    });

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: CommandIDs.create,
        args: widget => ({ id: widget.content.model.id }),
        name: widget => widget.content.model.id
      });
    }

    if (sidebar) {
      tracker.currentChanged.connect((_, current) => {
        sidebar.model = current ? current.content.model : null;
      });
    }

    return tracker;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  consoles,
  files,
  notebooks,
  sidebar,
  tracker
];

export default plugins;
