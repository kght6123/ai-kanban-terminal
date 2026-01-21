# NPM自動デプロイ設定ガイド

このガイドでは、AI Kanban Terminalをnpmに自動でデプロイするための設定手順を説明します。

## 目次

1. [npm側の設定](#npm側の設定)
2. [GitHub側の設定](#github側の設定)
3. [リリースの作成方法](#リリースの作成方法)
4. [トラブルシューティング](#トラブルシューティング)

---

## npm側の設定

### 1. npmアカウントの作成

まだnpmアカウントをお持ちでない場合は、以下の手順でアカウントを作成します。

1. [npm公式サイト](https://www.npmjs.com/)にアクセス
2. 「Sign Up」ボタンをクリック
3. ユーザー名、メールアドレス、パスワードを入力
4. メールアドレスを確認して登録を完了

### 2. npm Access Tokenの作成

GitHub Actionsからnpmに公開するには、Access Tokenが必要です。

1. [npm公式サイト](https://www.npmjs.com/)にログイン
2. 右上のアバターをクリックし、「Access Tokens」を選択
3. 「Generate New Token」をクリック
4. Token typeとして「Automation」を選択
   - **Automation**: CI/CDシステムで使用するためのトークン（推奨）
5. トークンの説明を入力（例：`GitHub Actions for ai-kanban-terminal`）
6. 「Generate Token」をクリック
7. **重要**: 表示されたトークンをコピーして安全な場所に保存
   - このトークンは一度しか表示されません
   - 後述のGitHub Secretsに保存します

### 3. パッケージ名の確認

パッケージ名がnpmで利用可能か確認します。

```bash
npm view ai-kanban-terminal
```

もし既に存在する場合は、`package.json`の`name`フィールドを変更してください。

例：`@your-username/ai-kanban-terminal`

---

## GitHub側の設定

### 1. npm Tokenをシークレットとして登録

1. GitHubリポジトリのページにアクセス
2. 「Settings」タブをクリック
3. 左サイドバーの「Secrets and variables」→「Actions」を選択
4. 「New repository secret」ボタンをクリック
5. 以下の情報を入力：
   - **Name**: `NPM_TOKEN`
   - **Secret**: 先ほど作成したnpm Access Tokenを貼り付け
6. 「Add secret」ボタンをクリック

### 2. ワークフローファイルの確認

`.github/workflows/publish-npm.yml`ファイルが存在することを確認します。

このファイルには以下の内容が含まれています：

- **トリガー**: 
  - Releaseが作成されたとき
  - 手動実行（workflow_dispatch）
- **処理内容**:
  1. リポジトリのチェックアウト
  2. Node.jsのセットアップ
  3. 依存関係のインストール
  4. ビルドの実行
  5. npmへの公開

### 3. package.jsonの設定確認

以下の設定が`package.json`に含まれていることを確認：

```json
{
  "name": "ai-kanban-terminal",
  "version": "1.0.0",
  "bin": {
    "ai-kanban-terminal": "./server.js"
  },
  "files": [
    "dist",
    "server.js",
    "index.html",
    "package.json",
    "README.md"
  ],
  "scripts": {
    "prepublishOnly": "npm run build"
  }
}
```

重要なポイント：

- **files**: npmに公開するファイルのリスト（`dist`フォルダを含む）
- **bin**: コマンドラインツールとして実行できるようにする設定
- **prepublishOnly**: 公開前に自動でビルドを実行

---

## リリースの作成方法

### 方法1: GitHubのUI経由（推奨）

1. GitHubリポジトリのページにアクセス
2. 「Releases」セクションをクリック
3. 「Draft a new release」ボタンをクリック
4. 以下の情報を入力：
   - **Tag version**: 例: `v1.0.0`, `v1.0.1`
     - バージョン番号は`package.json`と一致させることを推奨
   - **Release title**: 例: `Release v1.0.0`
   - **Description**: リリースの変更内容を記述
5. 「Publish release」ボタンをクリック

リリースが作成されると、自動的にGitHub Actionsワークフローが起動し、npmに公開されます。

### 方法2: gitコマンド経由

```bash
# バージョンを更新（package.jsonとgitタグを作成）
npm version patch  # パッチバージョン (1.0.0 → 1.0.1)
# または
npm version minor  # マイナーバージョン (1.0.0 → 1.1.0)
# または
npm version major  # メジャーバージョン (1.0.0 → 2.0.0)

# タグをプッシュ
git push origin main --tags

# GitHubでタグからReleaseを作成
# (GitHubのUIで該当タグからReleaseを作成)
```

### 方法3: 手動実行

緊急時やテスト時は、GitHub Actionsを手動で実行できます：

1. GitHubリポジトリの「Actions」タブをクリック
2. 「Publish to npm」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. ブランチを選択して「Run workflow」を確認

---

## リリース後の確認

### 1. npm公開の確認

```bash
npm view ai-kanban-terminal
```

最新バージョンが表示されることを確認します。

### 2. npxでの動作確認

```bash
npx ai-kanban-terminal@latest
```

ブラウザが開き、ターミナル画面が表示されることを確認します。

---

## トラブルシューティング

### ワークフローが失敗する

**症状**: GitHub Actionsワークフローが失敗する

**原因と対処法**:

1. **npm Tokenが正しく設定されていない**
   - GitHubのSecretsに`NPM_TOKEN`が正しく登録されているか確認
   - npm Access Tokenが有効期限内であるか確認

2. **パッケージ名が既に使用されている**
   - `npm view <package-name>`でパッケージの存在を確認
   - 必要に応じて`package.json`の`name`フィールドを変更

3. **ビルドエラー**
   - ローカルで`npm run build`を実行してエラーがないか確認
   - ワークフローログで詳細なエラーメッセージを確認

### npxで実行しても画面が表示されない

**症状**: `npx ai-kanban-terminal`を実行しても、ブラウザでターミナル画面が表示されない

**原因と対処法**:

1. **distフォルダが公開されていない**
   - `package.json`の`files`フィールドに`"dist"`が含まれているか確認
   - `.npmignore`で`dist`が除外されていないか確認

2. **ビルドが実行されていない**
   - `prepublishOnly`スクリプトが設定されているか確認
   - ローカルで`npm run build`を実行して`dist`フォルダが生成されるか確認

3. **ポートが使用中**
   - デフォルトのポート3000が他のプロセスで使用されていないか確認
   - 環境変数`PORT`で別のポートを指定できます

### バージョン番号の管理

**ベストプラクティス**:

- [Semantic Versioning](https://semver.org/)に従う
  - **MAJOR**: 互換性のない変更
  - **MINOR**: 後方互換性のある機能追加
  - **PATCH**: 後方互換性のあるバグ修正
- `package.json`のバージョンとGitタグのバージョンを一致させる
- Changelogを維持する

---

## 参考リンク

- [npm公式ドキュメント](https://docs.npmjs.com/)
- [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)
- [Semantic Versioning](https://semver.org/)
- [npm package.json files フィールド](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#files)

---

## まとめ

このガイドに従って設定を行うことで：

1. ✅ GitHubでReleaseを作成するだけでnpmに自動公開
2. ✅ `npx ai-kanban-terminal`でどこからでも実行可能
3. ✅ distフォルダが含まれているため、ブラウザで正しく表示
4. ✅ バージョン管理が容易

何か問題が発生した場合は、トラブルシューティングセクションを参照してください。
