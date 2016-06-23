#!/bin/bash

set -e # Exit with nonzero exit code if anything fails

# make sure we are on the latest version
cd source
git pull origin posts
git checkout posts
cd ..

# this will output posts into the source directory submodule
gulp

cd source

# Save some useful information
REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

git config user.name "Travis CI"
git config user.email "$COMMIT_AUTHOR_EMAIL"

chmod 600 ../deploy_key
eval `ssh-agent -s`
ssh-add ../deploy_key

# scrape the webpage
if [ "$(git status --porcelain)" = "" ]; then
  echo "There are no new post updates."
  exit 0
fi

echo $SSH_REPO
echo $REPO

git add . &>/dev/null
git commit -m "Update posts [ci skip]"
git push $SSH_REPO posts
