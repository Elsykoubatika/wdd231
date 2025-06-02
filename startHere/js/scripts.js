

const openButton = document.querySelector("#openButton");
const dialogBox = document.querySelector("#dialogBox");
const closeButton = document.querySelector("#closeButton");

openButton.addEventListener("click", () =>{
        dialogBox.showModal();

});

closeButton.addEventListener("click", () => {
        dialogBox.close();
});


const getString = window.location.search;
console.log(getString);

const myInfo = new URLSearchParams(getString);
console.log(myInfo);

console.log(myInfo.get('first'));
console.log(myInfo.get('last'));
console.log(myInfo.get('ordinance'));
console.log(myInfo.get('date'));
console.log(myInfo.get('loaction'));
console.log(myInfo.get('phone'));
console.log(myInfo.get('email'));

document.querySelector('#results').innerHTML = `
<p>Appointement for ${myInfo.get('first')} ${myInfo.get('last')}</p>
<p>Proxy ${myInfo.get('ordinance')} ${myInfo.get('date')} ${myInfo.get('location')} Temple</p>
<p> Your Phone ${myInfo.get('phone')} </p>
<p> Your Email ${myInfo.get('email')} </p>`;