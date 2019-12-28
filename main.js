let hostname = localStorage.hostname || 'en.wiktionary.org';
let appName = document.title;
let sub_pages = {};
let page_langs = [];
let page_cache = {};

function pre_fetch(title) {};

function fetch_page(title) {
    let cache_hit = page_cache[title];
    if (cache_hit) {
        console.log(`cache hit on ${title}!`);
        return Promise.resolve(cache_hit);
    }
    return fetch(`https://${hostname}/w/api.php?action=parse&page=${title}&origin=*&format=json`).then(x => x.json()).then(data => {
        page_cache[title] = data;
        return Promise.resolve(data);
    });
}

function load_page(title, lang, useReplaceState) {
    let pretty_title = decodeURIComponent(title).replace('_', ' ');

    let original_hash = lang ? ('#' + lang) : location.hash;
    if (original_hash === '#') {
        original_hash = '';
    }

    updateTitle();
    let canonical_url = location.href.split('#')[0].split('?')[0] + '?' + title + original_hash;
    console.log('canonical url: ' + canonical_url);
    if (location.href !== canonical_url) {
        console.log('but current url is: ' + location.href);
        if (useReplaceState) {
            console.log("replacing state instead");
            history.replaceState(null, pretty_title, canonical_url);
        } else {
            console.log('pushing state');
            history.pushState(null, pretty_title, canonical_url);
        }
    }

    document.getElementById("content").innerHTML = `<div id="loadingText"><span>Loading <b>${pretty_title}</b>...</span></div>`;
    document.title = `Loading ${pretty_title} - ${appName};`

    favlangs.value = localStorage.favlangs || '';
    domainbox.value = hostname;
    seealso.innerHTML = '';
    langs.innerHTML = '';

    document.getElementById('inputbar').value = pretty_title;

    let opt = document.createElement("option");
    opt.value = "default";
    opt.text = "See also";
    seealso.add(opt);
    seealso.disabled = true;

    langs.innerHTML = '';
    langs.disabled = true;

    fetch_page(title).then(
        (data) => {
            if (data.error) {
                document.getElementById("content").innerHTML = `Error loading ${title}: <b>${data.error.info}</b>`;
                return;
            }
            // load into virtual element
            let fetch_html = data.parse.text['*'];
            let html = document.createElement('body');
            html.innerHTML = fetch_html;
            html = html.firstChild; // get rid of top levl div

            // populate title in header
            //document.getElementById('title').textContent = data.parse.title;

            updateTitle();
            // populate language selector
            page_langs = Array.from(html.querySelectorAll('h2 > .mw-headline')).map(el => [el.textContent, el.id]);
            langs.innerHTML = '';
            let add_lang = (lang) => {
                let [lang_name, lang_id] = lang;
                let opt = document.createElement("option");
                opt.value = lang_id;
                opt.text = lang_name;
                langs.add(opt);
            };

            let fav_lang_names = favlangs.value.split('\n');
            for (const lang_name of fav_lang_names) {
                let found_val = page_langs.find(x => x[0] == lang_name);
                if (found_val) {
                    add_lang(found_val);
                }
            }

            for (const lang of page_langs.filter(x => !~fav_lang_names.indexOf(x[0]))) {
                add_lang(lang);
            }
            langs.disabled = page_langs.length <= 1;


            // delete table of contents
            let toc = html.querySelector('#toc');
            if (toc) {
                toc.remove();
            }

            // delete edit links
            for (const edit of html.querySelectorAll('.mw-editsection')) {
                edit.remove();
            }

            for (const navFrame of html.querySelectorAll('.NavFrame:not(.pseudo)')) {
                let detail = document.createElement("details");
                let summary = document.createElement("summary");
                summary.textContent = navFrame.querySelector('.NavHead').textContent;
                detail.appendChild(summary);
                detail.appendChild(navFrame.querySelector('.NavContent'));
                navFrame.parentNode.insertBefore(detail.cloneNode(true), navFrame);
                navFrame.remove();
            }



            let current_section_id = "";
            sub_pages = {};

            while (html.firstChild) {
                let el = html.firstChild;
                el.remove();
                if (current_section_id == "" && el.nodeName == "DIV" && ~el.textContent.indexOf("See also:")) {
                    // move "See also" links to dropdown in UI
                    for (a of el.getElementsByTagName('a')) {
                        seealso.disabled = false;
                        let opt = document.createElement("option");
                        opt.value = a.title;
                        opt.text = a.text;
                        seealso.add(opt);
                    }
                } else if (el.nodeName == "H2") {
                    // start new subpage when we hit an <h2>
                    // (which designates the beginning of a new language section)
                    current_section_id = el.lastChild.id;
                    sub_pages[current_section_id] = document.createElement('div');
                } else if (el.nodeName == "#text" || el.nodeName == "HR") {
                    // skrip <hr> and blank text
                    continue;
                } else {
                    // otherwise just add the element to the current subpage
                    if (!(current_section_id in sub_pages)) {
                        sub_pages[current_section_id] = document.createElement('div');
                    }
                    sub_pages[current_section_id].appendChild(el);
                }
            }
            if ('' in sub_pages) {
                add_lang(['N/A', '']);
            }

            // if the hash specifies a language, switch to it
            set_lang_from_hash();
        });
}

function set_lang_from_hash() {
    let found_val = page_langs.find(x => x[1] == location.hash.substr(1));
    console.log(`set_lang_from_hash, found_val=${found_val}`);
    if (found_val) {
        langs.value = found_val[1];
    }
    on_lang_change(!found_val);
}

function on_lang_change(useReplaceState=false) {
    updateTitle();
    if (langs.value !== "default") {
        set_subpage(langs.value, useReplaceState);
    }
}

function sync_from_url() {
    let query = location.search.split("?")[1];
    console.log(`sync_from_url, query=${query}`);
    if (query) {
        load_page(query);
    } else {
        let def = 'boomer'
        load_page(def, null, true);
    }
}

function updateTitle() {
    let query = location.search.split("?")[1];
    let pretty_query = decodeURIComponent(query).replace('_', ' ');
    lang = langs.value;
    let title = pretty_query;
    if (lang) {
        title += ` (${lang})`;
    }
    title += ` - ${appName}`;
    document.title = title;
}

function set_subpage(lang, useReplaceState=false) {
    console.log(`set_subpage, lang=${lang}, replaceState=${useReplaceState}`);
    if (langs.value != lang) {
        langs.value = lang;
    }
    if (location.hash == "")
        history.replaceState(null, document.title, location.href + '#' + lang);
    else {
        let newUrl = location.href.replace(location.hash, '#' + lang);
        if (location.href !== newUrl) {
            console.log(`${location.href} !== ${newUrl}, pushing new`);
            if (useReplaceState)
                history.replaceState(null, document.title, newUrl);
            else
                history.pushState(null, document.title, newUrl);
        }
    }

    const clone = sub_pages[lang].cloneNode(true);

    // rewrite internal links
    // have to do it here because clone doesn't preserve event handlers
    for (let a of clone.getElementsByTagName("a")) {
        if ((a.hostname === hostname || a.hostname === location.hostname) && a.pathname.startsWith('/wiki/')) {
            const full_target = a.href.split('/wiki/').pop()
            const [target, target_hash] = full_target.split('#');

            a.href = '?' + full_target;
            a.onclick = function(event) {
                load_page(target, target_hash);
                return false;
            };
        }
    }
    document.getElementById('content').innerHTML = '';
    document.getElementById('content').appendChild(clone);
}
langs.addEventListener('change', function() {

    document.getElementById("content").innerHTML = "";
    on_lang_change();
});
seealso.addEventListener('change', function() {
    load_page(this.value);
});
// TODO: both of these events should sync from url
window.onhashchange = set_lang_from_hash;
window.addEventListener('popstate', (event) => {
    sync_from_url();
});
document.getElementById('options-bg').addEventListener('click', function() {
    document.getElementById('options-container').style.display = 'none';
});
document.getElementById('showoptions').addEventListener('click', function() {
    document.getElementById('options-container').style.display = 'flex';
});
favlangs.addEventListener('change', function() {
    localStorage.favlangs = this.value;
});
domainbox.addEventListener('change', function() {
    hostname = this.value;
    page_cache = {};
    localStorage.hostname = this.value;
});
addfavlang.addEventListener('click', () => {
    favlangs.value = langs.options[langs.selectedIndex].text + "\n" + favlangs.value;
    favlangs.dispatchEvent(new Event('change'));
});

inputbar.addEventListener('focus', function() {
    //this.setAttribute("list","suggestions");
});
inputbar.addEventListener('blur', function() {
    //this.setAttribute("list","");
});
inputbar.addEventListener('input', function() {
    console.log('change');
    suggestions.innerHTML = '';
    fetch(`https://en.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(this.value)}&limit=15&namespace=0&format=json&origin=*`).then(x => x.json()).then((data) => {
        console.log(data);
        let [, titles, descriptions, links] = data;
        links = links.map(x => x.split('/wiki/').pop());
        for (const i in titles) {
            let opt = document.createElement("option");
            opt.value = titles[i];
            suggestions.appendChild(opt);
        }
        this.setAttribute("list", "");
        this.setAttribute("list", "suggestions");
        //this.click();
        //this.click();
    });
});
// firefox desktop fix:
if (window.navigator.userAgent.includes('20100101')) {
    inputbar.setAttribute("autoComplete", "off");
}
sync_from_url();
