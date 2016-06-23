#!/bin/bash

set -e # Exit with nonzero exit code if anything fails

git config user.name "Travis CI"
git config user.email "$COMMIT_AUTHOR_EMAIL"

chmod 600 deploy_key
eval `ssh-agent -s`
ssh-add deploy_key

# SOURCE_BRANCH="master"
# TARGET_BRANCH="gh-pages"
#
# function doCompile {
#   ./compile.sh
# }
#
# # Pull requests and commits to other branches shouldn't try to deploy, just build to verify
# if [ "$TRAVIS_PULL_REQUEST" != "false" -o "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" ]; then
#     echo "Skipping deploy; just doing a build."
#     doCompile
#     exit 0
# fi

# scrape the webpage
gulp
if [ "$(git status source/_posts/* --porcelain)" = "" ]; then
  echo "There are no new post updates."
else
  git add .
  git commit -m "Update posts [ci skip]"
  git push $SSH_REPO $SOURCE_BRANCH
fi
#
# # Save some useful information
# REPO=`git config remote.origin.url`
# SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
# SHA=`git rev-parse --verify HEAD`
#
# # Clone the existing gh-pages for this repo into out/
# # Create a new empty branch if gh-pages doesn't exist yet (should only happen on first deply)
# git clone $REPO out
# cd out
# git checkout $TARGET_BRANCH || git checkout --orphan $TARGET_BRANCH
# cd ..
#
# # Clean out existing contents
# cd out
# git rm -r .
# cd ..
#
# # Run our compile script
# doCompile
# cp -r public/* out
#
# cd out
# git config user.name "Travis CI"
# git config user.email "$COMMIT_AUTHOR_EMAIL"
#
# # If there are no changes to the compiled out (e.g. this is a README update) then just bail.
# if [ "$(git status --porcelain)" = "" ]; then
#     echo "No changes to the output on this push; exiting."
#     exit 0
# fi
#
# git add .
# git commit -m "Deploy to GitHub Pages: ${SHA}"
#
# # Get the deploy key by using Travis's stored variables to decrypt deploy_key.enc
# chmod 600 ../deploy_key
# eval `ssh-agent -s`
# ssh-add ../deploy_key
#
# # Now that we're all set up, we can push.
# git push $SSH_REPO $TARGET_BRANCH
