"use strict";

async function main() {


    function status(response) {
        /*This function returns a resolved promise if the fetch request has no error, and a rejected promise it has an error */
        if (response.status < 200 || response.status >= 300) {
            throw new Error('Response has code' + response.status)
        }
    }

    async function getRandomPeoplePage() {


        /* This function makes a fetch request to the wikquote "Category:People" page (https://en.wikiquote.org/wiki/Category:People) and returns a promise of an object containing a random pageID to a page within "Category:People" and an array of page ids to filter out in the next fetch request. The pages within "Category:People" are organized alphabetically by last name and contain a list of links to individual person pages */



        let peoplePagesQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=categorymembers&gcmtitle=Category:People&gcmnamespace=0&gcmlimit=500&format=json&formatversion=2"

        const response = await fetch(peoplePagesQuery);
        status(response);
        const responseJSON = await response.json();

        const validPage = responseJSON.query.pages.reduce((acc, item) => {

            acc.push(item.pageid)
            if (item.pageid == 119121 || item.pageid == 74) {
                acc.pop()
            }
            return acc

        }, [])


        let idsToFilter = responseJSON.query.pages.map(item => {
            return item.pageid
        })
        idsToFilter = idsToFilter.concat([161415, 161416, 161417, 161418, 161419, 161420, 94]);




        const res = {
            pageid: validPage[Math.floor(Math.random() * validPage.length)].toString(),
            idsToFilter: idsToFilter
        }


        return res;



    }

    async function getRandomPersonPages(data) {

        /* this function takes as an argument an object containing a random pageID to a page within "Category:People" and an array of pageids to be filtered out of the fetch response as they link back to "Category:People"

        wikimedia API requires "&continue=" within query url in order to continue the query passed the 500 element limit. The function handles these multiple requests using recursion. Returns a promise of an array of person pages*/


        let personPageQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=query&generator=links&gplnamespace=0&gpllimit=500&prop=info&format=json&formatversion=2&pageids="
        let personPages = []


        const response = await fetch(personPageQuery + data.pageid + "&continue=");
        status(response);
        const responseJSON = await response.json();



        personPages = personPages.concat(responseJSON.query.pages)

        if ("continue" in responseJSON) {
            let initCont = data.pageid + responseJSON.continue.continue+"&gplcontinue=" + responseJSON.continue.gplcontinue

            //function used for recursive fetch requests
            const fetchCont = async function(url, query) {

                const response = await fetch(url + query);
                status(response);
                const res = await response.json();

                if ("continue" in res) {
                    personPages = personPages.concat(res.query.pages)
                    let contQuery = data.pageid + res.continue.continue+"&gplcontinue=" + res.continue.gplcontinue
                    return fetchCont(personPageQuery, contQuery);

                } else {
                    personPages = personPages.concat(res.query.pages)
                    return personPages

                }

            }

            await fetchCont(personPageQuery, initCont);


        }

        //filter out pageids that don't lead to a person page
        personPages = personPages.filter((item) => {
            if ("pageid" in item && data.idsToFilter.includes(item.pageid) === false) {
                return item
            }
        })

        return personPages

    }

    async function getQuotePage(personPages) {

        /*This* function makes a fetch request to a person page using a random pageid from the array of person pages. Checks the JSON response for errors and returns a promise of a valid JSON response.*/

        const pageID = personPages[Math.floor(Math.random() * (personPages.length))]["pageid"].toString()

        const stubQuery = "https://en.wikiquote.org/w/api.php?action=query&format=json&origin=*&prop=templates&pageids=" + pageID

        try {

            const checkStub = await fetch(stubQuery);
            status(checkStub);
            const stubJSON = await checkStub.json();

            for (let x = 0; x < stubJSON.query.pages[pageID].templates.length; x++) {
                if (stubJSON.query.pages[pageID].templates[x]["title"].toLowerCase().includes("stub")) {
                    throw Error("stub page")
                }
            }


            const quoteQuery = "https://en.wikiquote.org/w/api.php?origin=*&action=parse&format=json&prop=text%7Csections%7Cdisplaytitle%7Cparsewarnings&section=1&pageid=" + pageID


            const response = await fetch(quoteQuery);
            status(response);
            const responseJSON = await response.json();


            if ("error" in responseJSON) {
                throw Error("json error")
            } else if ("sections" in responseJSON.parse != true) {
                throw Error("invalid sections")
            } else if (responseJSON.parse.sections[0].anchor.toLowerCase() != "quotes") {
                throw Error("quotes!= section 1")
            } else {
                return responseJSON
            }

        } catch (err) {
            console.log(err)
            return getQuotePage(personPages)
        }

    }

    async function getQuote(jsonObject) {

        /*This function takes a JSON object as an argument, grabs the quotes from the page, and used regex to parse out valid quotes. Returns a promise of an object containing a single random quote from the page and the author's name */


        try {

            const title = jsonObject.parse.title
            const grabDirtyQuotes = new RegExp(/<ul>(.*?)<ul>/gm);
            const grabLineBreaks = new RegExp(/<br\s?\/>/gm)
            const cleanUpQuotes = new RegExp(/<(?!\/?br(?=>|\s.*>))\/?.*?>|\\n|\\/gm);
            const verifierString = "[\\[\\]\\^\\+\\{\\}\\=]|\\d{4}|^\\d+?\\d+$|\\d+\\)?$|\\d+\\.\\d+?|\\d+\\w|\\W{4,}|1.Quotes|\\[edit\\]|Reffering to|p+[g]?\\.\\s?(?=\\d+|[xivcml]+)|page[s]?\\s?\\d+|ch\\.\\s?(?=\\d+|[xivcml]+)|chapter\\.?\\s(?=\\d+|[xivcml]+)|Book\\.?\\s?(?=\\d+|[xivcml]+)|line+s?\\.?\\s?(?=\\d+|[xivcml]+)|Vol(ume)?\\.|paragraph\\s?(?=\\d+|[xivcml]+)|edition|source needed|stanza|canto|Act,?\\s?scene|quoted|from the album|" + title
            const verifier = new RegExp(verifierString, "mi")



            //apply regex to clean up and validate quotes 
            let quotes = (JSON.stringify(jsonObject.parse.text['*']).match(grabDirtyQuotes)).reduce(function(results, item) {
                if (verifier.test(item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, "")) != true && item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, "").length >= 20) {
                    results.push(item.replace(grabLineBreaks, "<br>").replace(cleanUpQuotes, ""))
                }
                return results

            }, [])


            if (quotes.length == 0) {
                throw Error("Empty array after cleanup")
            }

            return {
                quote: quotes[Math.floor(Math.random() * quotes.length)],
                author: jsonObject.parse.title
            }
            
        } catch (err) {
            console.log(err)
            let response = await getRandomPeoplePage();
            let people = await getRandomPersonPages(response)
            let quotePage = await getQuotePage(people)
            let quote = await getQuote(quotePage)
            return quote
        }

    };

    function displayQuote(data) {
        /*this function renders the quote and author on the page. It takes in as an argument an object containing two key/value pairs: a single random quote and the author */

        let quote = data.quote
        let author = data.author
        document.getElementById("text").innerHTML = quote;
        document.getElementById("author").innerHTML = "—" + author;


    }

    function updateSocialMediaLinks() {

        /*This function updates the post to twitter and tumblr links when the quote changes*/

        document.getElementById("tweet-link").setAttribute('href', "http://twitter.com/intent/tweet?text=" + encodeURI(document.getElementById("text").innerHTML) + encodeURI(document.getElementById("author").innerHTML))

        document.getElementById("tumblr-link").setAttribute('href', "https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=quotes&caption=" + encodeURI(document.getElementById("author").innerHTML) + "&content=" + encodeURI(document.getElementById("text").innerHTML) + "&canonicalUrl=https%3A%2F%2Fwww.tumblr.com%2Fbuttons&shareSource=tumblr_share_button&posttype=quote")


    }

    function navigation() {

        document.getElementById('new-quote').onclick = quoteMachine

        document.getElementById("prev-quote").onclick = function() {
            document.getElementById("text").innerHTML = quoteMachine.previous[quoteMachine.lastIndex]["quote"]
            document.getElementById("author").innerHTML = "—" + quoteMachine.previous[quoteMachine.lastIndex]["author"]
            quoteMachine.lastIndex--;

            updateSocialMediaLinks();

        }


    }

    async function quoteMachine() {

        let response = await getRandomPeoplePage();
        let people = await getRandomPersonPages(response)
        let quotePage = await getQuotePage(people)
        let quote = await getQuote(quotePage)
        let display = await displayQuote(quote)
        let social = await updateSocialMediaLinks();
        let nav = await navigation();

        if (quoteMachine.previous == undefined) {
            quoteMachine.previous = [];
        }
        if (quote) {
            quoteMachine.previous.push(quote)
            quoteMachine.lastIndex = quoteMachine.previous.length - 2;
        }

        document.getElementById("social-box").style.visibility = "visible";

    }

    quoteMachine();    

};

main();