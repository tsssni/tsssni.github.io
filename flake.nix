{
  description = "blog devenv";

  inputs = {
    tsssni.url = "github:tsssni/tsssni.nix";
    nixpkgs.follows = "tsssni/nixpkgs";
    systems.follows = "tsssni/systems";
    flake-parts.follows = "tsssni/flake-parts";
  };

  outputs =
    {
      flake-parts,
      ...
    }@inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;

      perSystem =
        {
          pkgs,
          lib,
          system,
          ...
        }:
        let
          webfonts = pkgs.symlinkJoin {
            name = "plextina-webfonts";
            paths = pkgs.plextina.passthru |> lib.attrValues |> lib.catAttrs "webfont";
          };
        in
        {
          _module.args.pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = with inputs; [ tsssni.overlays.default ];
          };

          devShells.default = pkgs.mkShell.override { stdenv = pkgs.stdenvNoCC; } {
            shellHook = ''
              export PLEXTINA=${webfonts}/share/fonts
            '';
            packages = with pkgs; [
              hugo
              nodejs
            ];
          };
        };
    };
}
