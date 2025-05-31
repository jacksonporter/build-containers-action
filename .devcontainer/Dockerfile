FROM public.ecr.aws/lts/ubuntu:22.04_stable

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install dependencies
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      zsh \
      libssl-dev \
      libyaml-dev \
      gnupg \
      zlib1g-dev \
      cmake \
      pkg-config \
      sudo \
      locales \
    && mkdir -p -m 755 /etc/apt/keyrings \
    && out=$(mktemp) && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o $out \
    && cat $out | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install gh -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && locale-gen en_US.UTF-8

# create developer user, set default shell to zsh
RUN useradd -m developer \
  && chsh -s /bin/zsh developer \
  && echo "developer ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# set developer user as the default user
USER developer

# install Oh My Zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# install mise
# hadolint ignore=SC2016
RUN curl https://mise.run | sh \
    && echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc \
    && echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zprofile \
    && echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc \
    && echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bash_profile
