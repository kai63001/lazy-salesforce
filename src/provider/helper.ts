import * as vscode from "vscode";
import { Location, Position, ProviderResult, TextDocument, Uri } from "vscode";

interface FindResult {
  path: string;
  match: boolean;
  lineNumber: number;
  colNumber: number;
}

export class salefoceController implements vscode.DefinitionProvider {
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

    const document = await vscode.workspace.openTextDocument(
      Uri.file(file.fsPath)
    );

    const tagMatch = findTagInDocumentRegex.test(document.getText());
    let lineNumber = 0;
    let colNumber = 0;
    console.log(tagMatch);
    if (tagMatch) {
      const lines = document.getText().split("\n");
      lines.forEach((line, index) => {
        // console.log("line", line);
        if (line.includes(`${clickedTag}: `)) {
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

    var currentlyOpenTabfilePath: any =
      vscode.window.activeTextEditor?.document.fileName;

    //remove root path from currentlyOpenTabfilePath
    currentlyOpenTabfilePath = currentlyOpenTabfilePath.replace(
      vscode.workspace.rootPath,
      ""
    );
    currentlyOpenTabfilePath = currentlyOpenTabfilePath
      .toString()
      .replaceAll("\\", "/")
      .slice(1);

    console.log("currentlyOpenTabfileName", currentlyOpenTabfilePath);
    let ac = currentlyOpenTabfilePath;
    let removeLast = ac.split("/").pop();
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

  private async find(clickedTag: string,document:TextDocument): Promise<Location> {

    const cacheName = clickedTag+":"+document.fileName;

    const cachedResult = this.cache[cacheName];
    // console.log("cachedResult", cachedResult);
    // console.log("clickedTag", clickedTag);

    console.log(document.uri.path)

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
          this.cache[cacheName] = null;
        } else {
          this.cache[cacheName] = res.uri.path;
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
    return this.find(clickedTag,document);
  }
}
