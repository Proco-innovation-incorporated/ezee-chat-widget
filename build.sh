#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ] ; do SOURCE="$(readlink "$SOURCE")"; done
SCRIPTDIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

# Default mode
MODE="development"

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --mode) MODE="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

echo "Building in $MODE mode..."

# Determine the correct API base URL
#if [ "$MODE" == "production" ]; then
#  API_URL="https://channel.prod.ezeeassist.io"
#else
#  API_URL="https://channel.dev.ezeeassist.io"
#fi

# Define paths
#JS_FILE_PATH="./chat-plugin/assets/js/application-exec.js"
#PHP_FILE_PATH="./chat-plugin/chat-plugin.php"

# Update the JavaScript file with the correct API base URL
#sed -i "s|window.apiBaseUrl = '.*';|window.apiBaseUrl = '$API_URL';|g" "$JS_FILE_PATH"

# Update the PHP file with the correct API base URL
#sed -i "s|\$api_url = '.*';|\$api_url = '$API_URL';|g" "$PHP_FILE_PATH"

# Improved version pattern to match the "Version:" line in the PHP file
#VERSION_PATTERN='(?<=Version:\s)[\d\.]+'

#CURRENT_VERSION=$(grep -oP 'Version:\s*\K[0-9]+\.[0-9]+\.[0-9]+' "$PHP_FILE_PATH")
#MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
#MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
#PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
#NEW_PATCH=$((PATCH + 1))
#NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
#sed -i -E "s/Version: $CURRENT_VERSION/Version: $NEW_VERSION/g" "$PHP_FILE_PATH"
#echo "Version incremented to $NEW_VERSION"

vite build --mode "$MODE"

cp ./dist/assets/index-*.js ./chat-plugin/assets/js/widget-app.js
cp ./dist/assets/index-*.css ./chat-plugin/assets/css/widget-style.css

# Create a release folder based on the mode
RELEASE_DIR="./releases/chat-plugin-$MODE-$(date +%s)"
mkdir -p "$RELEASE_DIR"

# Copy the entire chat-plugin directory to the release folder
cp -r ./chat-plugin/* "$RELEASE_DIR"

echo "Release directory created at $RELEASE_DIR"

rm -rf "$SCRIPTDIR/chat-plugin.zip" && (
	cd "$RELEASE_DIR" && \
	zip -r "$SCRIPTDIR/chat-plugin.zip" . && \
	echo "Release zip: $SCRIPTDIR/chat-plugin.zip"
)

rm -rf "$SCRIPTDIR/dist.zip" && (
	cd "./dist" && \
	zip -r "$SCRIPTDIR/dist.zip" . && \
	echo "Distribution zip: $SCRIPTDIR/dist.zip"
)
