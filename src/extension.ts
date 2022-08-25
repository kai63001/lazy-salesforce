import * as vscode from "vscode";
import { salefoceController } from "./provider/controller";

export function activate(context: vscode.ExtensionContext) {
  const selectorRegistration = vscode.languages.registerDefinitionProvider(
    {
      language: "html",
      pattern: "**/*.cmp",
      scheme: "file",
    },
    new salefoceController(context)
  );

  context.subscriptions.push(selectorRegistration);
}

// this method is called when your extension is deactivated
export function deactivate() {}
