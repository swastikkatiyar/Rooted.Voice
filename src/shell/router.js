export function route(){return location.hash.replace(/^#\/?/,'')||'home'}export function navigate(path){location.hash='/'+path}
