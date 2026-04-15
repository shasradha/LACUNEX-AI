export const LANGUAGES = [
  {
    id: 71,  // Judge0 language ID
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
    id: 63,
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
    id: 54,
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
    id: 62,
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
    id: 50,
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
    id: 73,
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
    id: 60,
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
    id: 68,
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
    id: 72,
    name: 'Ruby',
    monaco: 'ruby',
    icon: '💎',
    extension: 'rb',
    template: `puts "Hello from LACUNEX!"
`,
  },
  {
    id: 74,
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
