{
  description = "leetcode devenv";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    {
      nixpkgs,
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
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell.override { stdenv = pkgs.stdenvNoCC; } {
            shellHook = ''
              export SHELL=nu
            '';
            packages = with pkgs; [
              hugo
              nodejs
            ];
          };
        }
      );
    in
    {
      inherit devShells;
    };
}
