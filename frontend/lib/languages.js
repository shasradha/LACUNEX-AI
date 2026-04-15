export const LANGUAGES = [
  {
    id: 100,  // v1.13.1 Python 3.12.5
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
    id: 102,  // v1.13.1 Node.js 22.08.0
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
    id: 105,  // v1.13.1 G++ 14.1.0
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
    id: 91,   // v1.13.1 Java 17.0.6
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
    id: 103,  // v1.13.1 GCC 14.1.0
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
    id: 108,  // v1.13.1 Rust 1.85.0
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
    id: 107,  // v1.13.1 Go 1.23.5
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
    id: 98,   // v1.13.1 PHP 8.3.11
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
    id: 72,   // v1.13.1 Ruby 2.7.0
    name: 'Ruby',
    monaco: 'ruby',
    icon: '💎',
    extension: 'rb',
    template: `puts "Hello from LACUNEX!"
`,
  },
  {
    id: 101,  // v1.13.1 TypeScript 5.6.2
    name: 'TypeScript',
    monaco: 'typescript',
    icon: '🔷',
    extension: 'ts',
    template: `const greeting: string = "Hello from LACUNEX!";
console.log(greeting);
`,
  },
]

export const getLanguageById = (id) =>
  LANGUAGES.find(l => l.id === id) || LANGUAGES[0]

export const getLanguageByMonaco = (monacoId) =>
  LANGUAGES.find(l => l.monaco === monacoId) || LANGUAGES[0]
