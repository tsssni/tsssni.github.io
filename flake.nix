{
  description = "blowfish devenv";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
  };

  outputs = {
    nixpkgs
    , ...
  }:
  let
    setupShell = shell: system: let
      pkgs = import nixpkgs {
        inherit system;
      };
    in pkgs.mkShell {
      packages = with pkgs; [
        go
        hugo
        nodejs_22
      ];

      shellHook = ''
        exec ${shell}
      '';
    };
  in {
    devShells."aarch64-darwin".default = setupShell "zsh" "aarch64-darwin";
    devShells."x86_64-linux".default = setupShell "elvish" "x86_64-linux";
  };
}
