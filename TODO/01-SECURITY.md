# TODO: Segurança e Hardening (Prioridade: CRÍTICA)

Este documento detalha as vulnerabilidades de segurança identificadas no código e nas configurações de build do Anchor App, juntamente com o plano de correção correspondente.

---

## 1. Exposição de Segredo de Assinatura (Keystore Password em Texto Claro)
- **Localização**: `android/keystore/KEYSTORE_PASSWORD.txt` e referências em `BUILD.md`.
- **Severidade**: **CRÍTICA**
- **Diagnóstico**:
  A senha da chave criptográfica de produção (`anchor-release.keystore`) estava gravada em texto puro no arquivo `KEYSTORE_PASSWORD.txt` dentro da árvore de diretórios do projeto. *(Valor removido deste documento — ele havia sido commitado aqui e deve ser considerado comprometido; troque a senha com `keytool -storepasswd` / `keytool -keypasswd`.)*
  Embora `android/keystore/` esteja listado no `.gitignore`, o armazenamento desprotegido em disco e a instrução no `BUILD.md` para ler a senha via `cat keystore/KEYSTORE_PASSWORD.txt` apresentam grave risco de exfiltração, vazamento acidental em commits forçados (`git add -f`) ou backups compactados.
- **Plano de Correção**:
  1. Remover o arquivo `KEYSTORE_PASSWORD.txt` do diretório do projeto.
  2. Configurar o carregamento da senha por meio de variáveis de ambiente (`ANDROID_KEYSTORE_PASS`) ou de um arquivo de propriedades local e protegido (ex: `~/.gradle/gradle.properties` fora do projeto).
  3. Atualizar `BUILD.md` para instruir o uso de variáveis de ambiente no processo do `apksigner`:
     ```bash
     "$BUILD_TOOLS/apksigner" sign --ks /caminho/seguro/anchor-release.keystore \
       --ks-pass "env:ANDROID_KEYSTORE_PASS" --key-pass "env:ANDROID_KEYSTORE_PASS" ...
     ```

---

## 2. Ausência de Content Security Policy (CSP)
- **Localização**: `index.html`
- **Severidade**: **ALTA**
- **Diagnóstico**:
  O arquivo `index.html` não possui a meta tag `Content-Security-Policy`. Como se trata de um app empacotado via Capacitor (WebView), a falta de CSP permite que qualquer dependência vulnerável ou injeção de script carregue recursos externos não autorizados, execute código inline irrestrito ou contate domínios externos arbitrários.
- **Plano de Correção**:
  Adicionar uma diretiva restritiva no `<head>` do `index.html`:
  ```html
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self' capacitor:;
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: capacitor:;
    connect-src 'self' capacitor:;
  ">
  ```
  *(Nota: Para produção nativa recomendada, as fontes do Google Fonts (`Caprasimo` e `Figtree`) devem ser empacotadas localmente no bundle para permitir execução 100% offline e eliminar a dependência externa).*

---

## 3. R8 / ProGuard Desativado em Compilação de Release
- **Localização**: `android/app/build.gradle` (linha 19)
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Na configuração de build de produção, a otimização e ofuscação estão explicitamente desligadas:
  ```groovy
  buildTypes {
      release {
          minifyEnabled false
          proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      }
  }
  ```
  Isso deixa o APK com classes Java/Kotlin abertas para descompilação imediata por ferramentas como `jadx` ou `apktool`, expondo a ponte Capacitor interna e metadados.
- **Plano de Correção**:
  1. Habilitar `minifyEnabled true` e `shrinkResources true` no bloco `release`.
  2. Ajustar `android/app/proguard-rules.pro` com as regras oficiais do Capacitor para evitar remoção acidental de pontes JavaScript-Java:
     ```pro
     -keepattributes *Annotation*
     -keepclassmembers class * {
         @android.webkit.JavascriptInterface <methods>;
     }
     -keep class com.getcapacitor.** { *; }
     ```

---

## 4. `android:allowBackup="true"` Habilitado Sem Restrição
- **Localização**: `android/app/src/main/AndroidManifest.xml` (linha 4)
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  O AndroidManifest declara `android:allowBackup="true"`. Em dispositivos Android conectados via `adb`, um atacante com acesso físico ou ferramentas de extração forense pode executar `adb backup` e extrair todo o conteúdo do banco de dados e do `localStorage` do WebView em texto simples sem root.
- **Plano de Correção**:
  Definir uma regra de exclusão com `android:fullBackupContent="@xml/backup_rules"` ou definir `android:allowBackup="false"` caso o app não ofereça sincronização em nuvem e prefira manter isolamento local estrito.

---

## 5. Validação e Sanitização de Entrada de Usuário
- **Localização**: `src/screens/Setup.tsx`, `src/screens/SettingsTab.tsx`
- **Severidade**: **MÉDIA**
- **Diagnóstico**:
  Campos de texto como `struggle.label` e `pet.name` são apenas truncados com `maxLength` e limpos com `.trim()`. Não há sanitização contra caracteres de controle, formatação invisível ou verificação de integridade antes da serialização no armazenamento.
- **Plano de Correção**:
  Implementar função utilitária de sanitização para restringir caracteres permitidos a texto visível e prevenir corrupção estrutural do JSON persistido.
