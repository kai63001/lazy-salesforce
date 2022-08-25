import * as vscode from "vscode";
import { Location, Position, ProviderResult, TextDocument, Uri } from "vscode";
import * as fs from "fs";

interface FindResult {
  path: string;
  match: boolean;
  lineNumber: number;
  colNumber: number;
}

export class AngularSelectorDefinitionProvider
  implements vscode.DefinitionProvider
{
  context: vscode.ExtensionContext;
  cache: any;
  cacheName: string = this.toString();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.cache = this.context.globalState.get(this.cacheName, {});
  }

  private async searchTag(file: Uri, clickedTag: string): Promise<FindResult> {
    //regexp find function definition
    const findTagInDocumentRegex = new RegExp(`${clickedTag}: `, "i");
    // const findTagInDocumentRegex = new RegExp(
    //   ``,
    //   "i"
    // );

    const document = await vscode.workspace.openTextDocument(
      Uri.file(file.fsPath)
    );
    console.log("file", file.fsPath);
    console.log("document", document.getText());

    const tagMatch = findTagInDocumentRegex.test(document.getText());
    let lineNumber = 0;
    let colNumber = 0;
    console.log(tagMatch);
    if (tagMatch) {
      const componentName = clickedTag
        .substring(clickedTag.indexOf("-"))
        .replace(/-/g, "")
        .toLowerCase();
      const lines = document.getText().split("\n");
      lines.forEach((line, index) => {
        if (
          line.includes("class") &&
          line.toLowerCase().includes(`${componentName}`)
        ) {
          lineNumber = index;
        }
      });
    }

    return {
      path: file.fsPath,
      match: tagMatch,
      lineNumber,
      colNumber,
    };
  }

  private async searchInAllFiles(clickedTag: string): Promise<any> {
    // const files = await vscode.workspace.findFiles("*.js");

    //findFile activeTextEditor
    const activeEditor: any = vscode.window.activeTextEditor;
    let projectFolder: any = vscode.workspace.workspaceFolders
      ?.map((folder) => folder.uri.path)[0]
      .slice(1);
    //make projectFolder first letter uppercase
    projectFolder =
      projectFolder.charAt(0).toUpperCase() + projectFolder.slice(1);
    const activeFile = activeEditor.document.uri;
    let ac = activeFile.path
      .slice(1)
      .replace("\\", "/")
      .toString()
      .replace(projectFolder, "")
      .slice(1);
    let removeLast = ac.split('/').pop();
    ac = ac.replace(removeLast, "");

    const files = await vscode.workspace.findFiles(`${ac}*.js`);

    const mappedFiles = files.map((file) => this.searchTag(file, clickedTag));
    const fileObjects = await Promise.all(mappedFiles);

    const matchedFileObject = fileObjects.find((mo) => mo.match);
    return matchedFileObject ? matchedFileObject : null;
  }

  private buildLocation(tagDefinitionPath: FindResult): any {
    if (tagDefinitionPath === null) {
      // Returning null prevents the tag from being underlined, which makes sense as there's no tag definition match.
      return null;
    }

    // Returning a location gives VS Code a hint where to jump to when Ctrl/Cmd + click is invoked on the tag.
    return new Location(
      Uri.file(tagDefinitionPath.path),
      new Position(tagDefinitionPath.lineNumber, tagDefinitionPath.colNumber)
    );
  }

  private async find(clickedTag: string): Promise<Location> {
    const cachedResult = this.cache[clickedTag];
    console.log("cachedResult", cachedResult);
    console.log("clickedTag", clickedTag);

    if (cachedResult) {
      const result = await this.searchTag(Uri.parse(cachedResult), clickedTag);
      if (result.match) {
        return this.buildLocation(result);
      }
    }

    return this.searchInAllFiles(clickedTag)
      .then(this.buildLocation)
      .then((res) => {
        if (!res) {
          this.cache[clickedTag] = null;
        } else {
          this.cache[clickedTag] = res.uri.path;
        }

        this.context.globalState.update(this.cacheName, this.cache);
        return res;
      });
  }

  provideDefinition(
    document: TextDocument,
    position: Position
  ): ProviderResult<Location> {
    const wordRange = document.getWordRangeAtPosition(position);
    const clickedTag = document.getText(wordRange);
    return this.find(clickedTag);
  }
}
