#!/usr/bin/env bash
# Bootstrap: ensure Node 20+ and npx, then run the published bopodev CLI via npx.
# Vendored Node under BOPO_HOME is downloaded only when the system has no usable Node 20+
# with npx on PATH; otherwise the existing install is left alone.
# Usage:
#   curl -fsSL https://bopo.dev/install.sh | bash
#   curl -fsSL https://bopo.dev/install.sh | bash -s -- onboard
#   curl -fsSL https://bopo.dev/install.sh | bash -s -- onboard --yes
#
# Environment (optional):
#   BOPO_NODE_VERSION   Node.js version to install (default: 20.18.3)
#   BOPO_CLI_VERSION    npm dist-tag or version for bopodev (default: latest)
#   BOPO_HOME           Base dir for vendored Node (default: ~/.bopodev)
#   BOPO_DIST_URL       Node dist root (default: https://nodejs.org/dist)
#   BOPO_MODIFY_PATH=1  Append PATH line to ~/.zshrc or ~/.bash_profile if missing

set -euo pipefail

readonly DEFAULT_NODE_VERSION="20.18.3"
NODE_VERSION="${BOPO_NODE_VERSION:-$DEFAULT_NODE_VERSION}"
CLI_VERSION="${BOPO_CLI_VERSION:-latest}"
BOPO_HOME="${BOPO_HOME:-$HOME/.bopodev}"
DIST_ROOT="${BOPO_DIST_URL:-https://nodejs.org/dist}"

die() {
  echo "bopo install: $*" >&2
  exit 1
}

node_major() {
  local v
  v="$("$1" -p "Number(process.versions.node.split('.')[0] || 0)" 2>/dev/null)" || v=0
  echo "$v"
}

has_usable_node_on_path() {
  command -v node >/dev/null 2>&1 || return 1
  command -v npx >/dev/null 2>&1 || return 1
  local major
  major="$(node_major "$(command -v node)")"
  [ "${major:-0}" -ge 20 ]
}

resolve_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os" in
    Darwin)
      OS_KEY="darwin"
      case "$arch" in
        arm64) NODE_ARCH_KEY="arm64" ;;
        x86_64) NODE_ARCH_KEY="x64" ;;
        *) die "unsupported Mac architecture: $arch" ;;
      esac
      ;;
    Linux)
      OS_KEY="linux"
      case "$arch" in
        x86_64 | amd64) NODE_ARCH_KEY="x64" ;;
        aarch64 | arm64) NODE_ARCH_KEY="arm64" ;;
        *) die "unsupported Linux architecture: $arch" ;;
      esac
      ;;
    *) die "unsupported OS: $os (macOS and Linux only)" ;;
  esac
}

verify_tarball_shasum() {
  local tarball_path sums_path name
  tarball_path="$1"
  sums_path="$2"
  name="$(basename "$tarball_path")"
  (
    cd "$(dirname "$tarball_path")"
    if command -v sha256sum >/dev/null 2>&1; then
      grep " ${name}\$" "$sums_path" | sha256sum -c -
    else
      grep " ${name}\$" "$sums_path" | shasum -a 256 -c -
    fi
  )
}

append_path_to_shell_rc() {
  local line rc node_bin
  node_bin="$1"
  line="export PATH=\"${node_bin}:\$PATH\"  # bopo.dev Node (install.sh)"
  if [ -f "$HOME/.zshrc" ]; then
    rc="$HOME/.zshrc"
  elif [ -f "$HOME/.zprofile" ]; then
    rc="$HOME/.zprofile"
  elif [ -f "$HOME/.bash_profile" ]; then
    rc="$HOME/.bash_profile"
  elif [ -f "$HOME/.profile" ]; then
    rc="$HOME/.profile"
  else
    case "${SHELL:-}" in
      */zsh) rc="$HOME/.zshrc" ;;
      */bash) rc="$HOME/.bash_profile" ;;
      *) rc="$HOME/.profile" ;;
    esac
  fi
  if [ -f "$rc" ] && grep -qF "$node_bin" "$rc" 2>/dev/null; then
    echo "bopo install: PATH already mentions $node_bin in $rc"
    return 0
  fi
  printf '\n%s\n' "$line" >>"$rc"
  echo "bopo install: appended PATH to $rc — open a new terminal or run: source $rc"
}

ensure_vendored_node() {
  local base ver tarball_name tarball_url sums_url tmp prefix
  base="$DIST_ROOT/v${NODE_VERSION}"
  ver="$NODE_VERSION"
  tarball_name="node-v${ver}-${OS_KEY}-${NODE_ARCH_KEY}.tar.gz"
  tarball_url="${base}/${tarball_name}"
  sums_url="${base}/SHASUMS256.txt"
  prefix="${BOPO_HOME}/node-v${ver}-${OS_KEY}-${NODE_ARCH_KEY}"

  if [ -x "${prefix}/bin/node" ] && [ -x "${prefix}/bin/npx" ]; then
    local major
    major="$(node_major "${prefix}/bin/node")"
    if [ "${major:-0}" -ge 20 ]; then
      export PATH="${prefix}/bin:${PATH}"
      echo "bopo install: using vendored Node ${ver} at ${prefix}/bin"
      if [ "${BOPO_MODIFY_PATH:-}" = "1" ]; then
        append_path_to_shell_rc "${prefix}/bin"
      else
        echo "bopo install: add to PATH for new shells:"
        echo "  export PATH=\"${prefix}/bin:\$PATH\""
      fi
      return 0
    fi
  fi

  mkdir -p "$BOPO_HOME"
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp:-}"' EXIT

  echo "bopo install: downloading Node.js ${ver} (${OS_KEY}-${NODE_ARCH_KEY})…"
  curl -fsSL -o "${tmp}/${tarball_name}" "$tarball_url"
  curl -fsSL -o "${tmp}/SHASUMS256.txt" "$sums_url"
  verify_tarball_shasum "${tmp}/${tarball_name}" "${tmp}/SHASUMS256.txt"

  rm -rf "$prefix"
  tar -xzf "${tmp}/${tarball_name}" -C "$BOPO_HOME"
  trap - EXIT
  rm -rf "${tmp}"

  export PATH="${prefix}/bin:${PATH}"
  echo "bopo install: installed Node ${ver} at ${prefix}/bin"
  if [ "${BOPO_MODIFY_PATH:-}" = "1" ]; then
    append_path_to_shell_rc "${prefix}/bin"
  else
    echo "bopo install: add to PATH for new shells:"
    echo "  export PATH=\"${prefix}/bin:\$PATH\""
  fi
}

main() {
  resolve_platform

  if has_usable_node_on_path; then
    echo "bopo install: using Node $(command -v node) ($(node -v))"
  else
    ensure_vendored_node
  fi

  # curl … | bash reads the script from stdin, so stdin is a pipe (EOF for children).
  # Interactive CLIs (e.g. onboard without --yes) need the real terminal.
  if [ ! -t 0 ] && [ -c /dev/tty ]; then
    exec < /dev/tty
  fi

  exec npx --yes "bopodev@${CLI_VERSION}" "$@"
}

main "$@"
