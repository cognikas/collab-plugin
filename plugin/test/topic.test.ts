import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readConfig, repoName, resolveTopic, setEnv } from '../src/lib/config.js';

/** A fake `git` that answers from a table of `<cwd>|<args>` → stdout. */
function gitFrom(answers: Record<string, string>) {
  return (cwd: string, args: string[]) => answers[`${path.resolve(cwd)}|${args.join(' ')}`];
}

const REPO = path.resolve('/work/MasterLive');
const WORKTREE = path.resolve('/work/MasterLive/.claude/worktrees/brave-otter');

describe('which topic a session joins', () => {
  it('is the repo folder name, as a slug', () => {
    const git = gitFrom({
      [`${REPO}|rev-parse --show-toplevel`]: REPO,
      [`${REPO}|rev-parse --git-common-dir`]: '.git',
    });
    expect(repoName(REPO, git)).toBe('MasterLive');
    expect(resolveTopic({}, REPO, git)).toBe('masterlive');
  });

  it('is the same from a subdirectory', () => {
    const sub = path.join(REPO, 'apps', 'cdk');
    const git = gitFrom({
      [`${sub}|rev-parse --show-toplevel`]: REPO,
      [`${REPO}|rev-parse --git-common-dir`]: '.git',
    });
    expect(resolveTopic({}, sub, git)).toBe('masterlive');
  });

  it('is the main repo\'s, not the worktree folder\'s, from a worktree', () => {
    const git = gitFrom({
      [`${WORKTREE}|rev-parse --show-toplevel`]: WORKTREE,
      [`${WORKTREE}|rev-parse --git-common-dir`]: path.join(REPO, '.git'),
    });
    expect(resolveTopic({}, WORKTREE, git)).toBe('masterlive');
  });

  it('is the submodule\'s own name inside a submodule', () => {
    const submodule = path.join(REPO, 'vendor', 'shared-ui');
    const git = gitFrom({
      [`${submodule}|rev-parse --show-toplevel`]: submodule,
      [`${submodule}|rev-parse --git-common-dir`]: path.join(REPO, '.git', 'modules', 'shared-ui'),
    });
    expect(resolveTopic({}, submodule, git)).toBe('shared-ui');
  });

  it('is the folder name outside git', () => {
    expect(resolveTopic({}, path.resolve('/tmp/Scratch Notes'), () => undefined)).toBe('scratch-notes');
  });

  it('is whatever was configured, when it was', () => {
    expect(resolveTopic({ topic: 'MasterLive Global' }, REPO, () => undefined)).toBe('masterlive-global');
  });

  it('falls back to "general" when nothing usable is left', () => {
    expect(resolveTopic({ topic: '###' }, path.resolve('/'), () => undefined)).toBe('general');
  });
});

describe('the topic setting', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('prefers COLLAB_TOPIC, which a project sets for itself, over the plugin option', () => {
    process.env.COLLAB_TOPIC = 'from-project';
    process.env.CLAUDE_PLUGIN_OPTION_TOPIC = 'from-option';
    expect(readConfig().topic).toBe('from-project');
  });

  it('treats an unset option, which arrives as the literal placeholder, as unset', () => {
    delete process.env.COLLAB_TOPIC;
    process.env.CLAUDE_PLUGIN_OPTION_TOPIC = '${user_config.topic}';
    expect(readConfig().topic).toBeUndefined();
    process.env.CLAUDE_PLUGIN_OPTION_TOPIC = '';
    expect(readConfig().topic).toBeUndefined();
  });
});

describe('setEnv', () => {
  it('removes the variable instead of storing "undefined"', () => {
    const env: NodeJS.ProcessEnv = { COLLAB_BRANCH: 'main' };
    setEnv('COLLAB_BRANCH', undefined, env);
    expect('COLLAB_BRANCH' in env).toBe(false);
    setEnv('COLLAB_BRANCH', 'feature/x', env);
    expect(env.COLLAB_BRANCH).toBe('feature/x');
    setEnv('COLLAB_BRANCH', '', env);
    expect(env.COLLAB_BRANCH).toBeUndefined();
  });
});
