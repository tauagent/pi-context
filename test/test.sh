#!/bin/bash
pi -ne -ns --skill ./skills -e ./src/index.ts "Context Tool Test Task
Strictly follow the steps below.
1. Create a tag as start.
2. Generate a random token and echo it.
3. Write it to the file /tmp/pi-context-random.
4. Checkout to the start tag; the checkout message must not contain the actual content of the token.
5. Forbidden from reading the file, guess the value of the token and echo it.
6. Compare the guessed value with the actual content in the file.
7. Output success if the guess is correct, and failure if it is incorrect."