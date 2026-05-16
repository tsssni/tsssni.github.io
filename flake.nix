{
  description = "blog devenv";

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
          ibm-plex-web = pkgs.ibm-plex.overrideAttrs (old: {
            src = old.src.overrideAttrs (_: {
              postBuild = ''
                find "$out" \( -name hinted -or -name unhinted \) -exec rm -fr {} +
              '';
            });
            postInstall = (old.postInstall or "") + ''
              mkdir -p $webfont
              cp -r $src/css $src/fonts $webfont/
            '';
          });
        in
        {
          default = pkgs.mkShell.override { stdenv = pkgs.stdenvNoCC; } {
            shellHook = ''
              export SHELL=nu
              export IBM_PLEX_WEB=${ibm-plex-web.webfont}
            '';
            packages = with pkgs; [
              hugo
              nodejs
              ibm-plex-web
            ];
          };
        }
      );
    in
    {
      inherit devShells;
    };
}
