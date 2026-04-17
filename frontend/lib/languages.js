export const LANGUAGES = [
  {
    name: 'Python',
    monaco: 'python',
    icon: '🐍',
    extension: 'py',
    template: `# Python - LACUNEX Code Studio
def main():
    print("Hello from LACUNEX!")

if __name__ == "__main__":
    main()
`,
  },
  {
    name: 'JavaScript',
    monaco: 'javascript',
    icon: '🟨',
    extension: 'js',
    template: `// JavaScript - LACUNEX Code Studio
function main() {
  console.log("Hello from LACUNEX!");
}

main();
`,
  },
  {
    name: 'HTML',
    monaco: 'html',
    icon: '🌐',
    extension: 'html',
    livePreview: true,
    template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LACUNEX Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      backdrop-filter: blur(20px);
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello from LACUNEX! 🚀</h1>
    <p>Start editing to see live changes</p>
  </div>
</body>
</html>
`,
  },
  {
    name: 'C++',
    monaco: 'cpp',
    icon: '⚡',
    extension: 'cpp',
    template: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from LACUNEX!" << endl;
    return 0;
}
`,
  },
  {
    name: 'Java',
    monaco: 'java',
    icon: '☕',
    extension: 'java',
    template: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from LACUNEX!");
    }
}
`,
  },
  {
    name: 'C',
    monaco: 'c',
    icon: '🔵',
    extension: 'c',
    template: `#include <stdio.h>

int main() {
    printf("Hello from LACUNEX!\\n");
    return 0;
}
`,
  },
  {
    name: 'Rust',
    monaco: 'rust',
    icon: '🦀',
    extension: 'rs',
    template: `fn main() {
    println!("Hello from LACUNEX!");
}
`,
  },
  {
    name: 'Go',
    monaco: 'go',
    icon: '🐹',
    extension: 'go',
    template: `package main

import "fmt"

func main() {
    fmt.Println("Hello from LACUNEX!")
}
`,
  },
  {
    name: 'PHP',
    monaco: 'php',
    icon: '🐘',
    extension: 'php',
    template: `<?php
echo "Hello from LACUNEX!\\n";
?>
`,
  },
  {
    name: 'Ruby',
    monaco: 'ruby',
    icon: '💎',
    extension: 'rb',
    template: `puts "Hello from LACUNEX!"
`,
  },
  {
    name: 'TypeScript',
    monaco: 'typescript',
    icon: '🔷',
    extension: 'ts',
    template: `const greeting: string = "Hello from LACUNEX!";
console.log(greeting);
`,
  },
]

export const getLanguageByMonaco = (monacoId) =>
  LANGUAGES.find(l => l.monaco === monacoId) || LANGUAGES[0]
