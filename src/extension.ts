import * as vscode from "vscode";
import { AngularSelectorDefinitionProvider } from "./provider/helper";

export function activate(context: vscode.ExtensionContext) {
  const selectorRegistration = vscode.languages.registerDefinitionProvider(
    {
      language: "html",
      pattern: "**/*.cmp",
      scheme: "file",
    },
    new AngularSelectorDefinitionProvider(context)
  );

  context.subscriptions.push(selectorRegistration);
}

// this method is called when your extension is deactivated
export function deactivate() {}
