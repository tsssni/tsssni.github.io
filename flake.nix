{
  description = "blog devenv";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    tsssni = {
      url = "github:tsssni/tsssni.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      tsssni,
      ...
    }:
    let
      lib = nixpkgs.lib;

      systems = [
        "aarch64-darwin"
        "x86_64-linux"
      ];

      systemAttrs = f: system: { ${system} = f system; };

      mapSystems = f: systems |> lib.map (systemAttrs f) |> lib.mergeAttrsList;

      devShells = mapSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = tsssni.pkgs;
          };
        in
        {
          default = pkgs.mkShell.override { stdenv = pkgs.stdenvNoCC; } {
            shellHook = ''
              export SHELL=nu
              export IBM_PLEX_WEB=${pkgs.ibm-plex.webfont}/share/fonts
            '';
            packages = with pkgs; [
              hugo
              nodejs
              ibm-plex
            ];
          };
        }
      );
    in
    {
      inherit devShells;
    };
}
