import requests

response = requests.get("https://map.baidu.com/newmap_test/static/common/images/transparent.gif?newmap=1&item=panotimethrough-click&code=10071&t=46955310&c=289")
print(response.content)
with open("transparent.gif", "wb") as f:
    f.write(response.content)
