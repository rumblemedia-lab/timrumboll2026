source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "jekyll-sitemap"
gem "jekyll-feed"

# Pinned to the older sassc-based converter. The default sass-embedded
# gem ships a compiled Dart runtime that crashes on some older macOS
# versions (Big Sur and earlier) — sassc is a plain C extension and
# doesn't have that problem.
gem "jekyll-sass-converter", "~> 2.2"

# Windows/JRuby compatibility
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]
