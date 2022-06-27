const categories = { guide: [{ url: `/posts/proxmox-install-on-poweredge/`, date: `26 Jun 2022`, title: `Guide: Installing Proxmox on a Stubborn Dell Poweredge`},],proxmox: [{ url: `/posts/proxmox-install-on-poweredge/`, date: `26 Jun 2022`, title: `Guide: Installing Proxmox on a Stubborn Dell Poweredge`},],homelab: [{ url: `/posts/proxmox-install-on-poweredge/`, date: `26 Jun 2022`, title: `Guide: Installing Proxmox on a Stubborn Dell Poweredge`},], }

window.onload = function () {
  document.querySelectorAll(".category").forEach((category) => {
    category.addEventListener("click", function (e) {
      const posts = categories[e.target.innerText];
      let html = ``
      posts.forEach(post=>{
        html += `
        <a class="modal-article" href="${post.url}">
          <h4>${post.title}</h4>
          <small class="modal-article-date">${post.date}</small>
        </a>
        `
      })
      document.querySelector("#category-modal-title").innerText = e.target.innerText;
      document.querySelector("#category-modal-content").innerHTML = html;
      document.querySelector("#category-modal-bg").classList.toggle("open");
      document.querySelector("#category-modal").classList.toggle("open");
    });
  });

  document.querySelector("#category-modal-bg").addEventListener("click", function(){
    document.querySelector("#category-modal-title").innerText = "";
    document.querySelector("#category-modal-content").innerHTML = "";
    document.querySelector("#category-modal-bg").classList.toggle("open");
    document.querySelector("#category-modal").classList.toggle("open");
  })
};