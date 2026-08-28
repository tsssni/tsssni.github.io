{
  description = "blog devenv";

  inputs = {
    tsssni.url = "github:tsssni/tsssni.nix";
    nixpkgs.follows = "tsssni/nixpkgs";
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
            overlays = [ tsssni.overlays.default ];
          };
        in
        {
          default = pkgs.mkShell.override { stdenv = pkgs.stdenvNoCC; } {
            shellHook = ''
              export SHELL=nu
              export IBM_PLEX_LITE=${pkgs.ibm-plex-lite.override { webfont = true; }}/share/fonts
            '';
            packages = with pkgs; [
              hugo
              nodejs
              ibm-plex-lite
            ];
          };
        }
      );
    in
    {
      inherit devShells;
    };
}
