// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef GIT_SALT_GIT_COMMAND_H__
#define GIT_SALT_GIT_COMMAND_H__

#include <string>
#include <cstring>
#include <git2.h>
#include <sys/mount.h>
#include <stdio.h>
#include<vector>

#include "ppapi/cpp/file_system.h"
#include "ppapi/cpp/var_dictionary.h"

#include "constants.h"
#include "git_salt.h"

class GitSaltInstance;

/**
 * Abstract class to defining git command. Every git command
 * should extend this.
 */
class GitCommand {
 protected:
  GitSaltInstance* _gitSalt;
  pp::VarDictionary _args;

 public:
  std::string url;
  std::string subject;
  int error;
  git_repository*& repo;

  GitCommand(GitSaltInstance* git_salt,
             const std::string& subject,
             const pp::VarDictionary& args,
             git_repository*& repository)
      : _gitSalt(git_salt), _args(args), subject(subject), repo(repository) {}

  virtual int parseArgs();
  virtual int runCommand() = 0;
};

class GitClone : public GitCommand {

 public:
  GitClone(GitSaltInstance* git_salt,
           std::string subject,
           pp::VarDictionary args,
           git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  int runCommand();
};

class GitInit : public GitClone {

 public:
  GitInit(GitSaltInstance* git_salt,
           std::string subject,
           pp::VarDictionary args,
           git_repository*& repo)
      : GitClone(git_salt, subject, args, repo) {}

  int runCommand();
};

class GitCommit : public GitCommand {

 public:
  std::string userName;
  std::string userEmail;
  std::string commitMsg;

  GitCommit(GitSaltInstance* git_salt,
            std::string subject,
            pp::VarDictionary args,
            git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  git_commit* getLastCommit();

  virtual int parseArgs();

  bool commitStage();

  int runCommand();
};

class GitCurrentBranch : public GitCommand {

 public:
  GitCurrentBranch(GitSaltInstance* git_salt,
                   std::string subject,
                   pp::VarDictionary args,
                   git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  virtual int parseArgs();

  int runCommand();
};

class GitGetBranches : public GitCommand {

 public:
  int flags;

  GitGetBranches(GitSaltInstance* git_salt,
                 std::string subject,
                 pp::VarDictionary args,
                 git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  virtual int parseArgs();

  int runCommand();
};

class GitAdd : public GitCommand {

 public:
  std::vector<std::string> entries;

  GitAdd(GitSaltInstance* git_salt,
         std::string subject,
         pp::VarDictionary args,
         git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  virtual int parseArgs();

  int runCommand();
};

class GitStatus : public GitCommand {

 public:
  int flags;

  GitStatus(GitSaltInstance* git_salt,
            std::string subject,
            pp::VarDictionary args,
            git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  int runCommand();
};

class GitLsRemote : public GitCommand {

 public:
  std::string url;
  std::string name;

  virtual int parseArgs();

  GitLsRemote(GitSaltInstance* git_salt,
              std::string subject,
              pp::VarDictionary args,
              git_repository*& repo)
      : GitCommand(git_salt, subject, args, repo) {}

  int runCommand();
};
#endif  // GIT_SALT_GIT_COMMAND_H__

