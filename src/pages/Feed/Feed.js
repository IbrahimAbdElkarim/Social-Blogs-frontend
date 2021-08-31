import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    const graphqlqQuery = {
      query: `
      query getStatus
      {
        user{
          status
        }
      }`
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlqQuery)
    })
      .then(res => {

        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error('getting posts failed!');
        }
        console.log("status", resData.data.user.status);
        this.setState({ status: resData.data.user.status });
      })
      .catch(this.catchError);

    this.loadPosts();

  }


  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    const graphqlqQuery = {
      query: `
      query fetchPost($page: Int!)
      {
        posts(page:$page){
          posts{
            title
            _id
           content
           imageUrl
           createdAt
           creator{
             name
           }
          }
          totalPosts
        }
      }`,
      variables: {
        page: page
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlqQuery)
    })
      .then(res => {

        return res.json();
      })
      .then(resData => {
        console.log(resData);
        if (resData.errors) {
          throw new Error('getting posts failed!');
        }
        this.setState({
          posts: resData.data.posts.posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            };
          }),
          totalPosts: resData.data.posts.totalPosts,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    const graphqlqQuery = {
      query: `
      
      mutation updateUserStatus($status: String!) {
        updateStatus(status:$status)
        {
          status
        }
      }
      `,
      variables: {
        status: this.state.status
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlqQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        if (resData.errors) {
          throw new Error('getting posts failed!');
        }
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData();
    // formData.append('title', postData.title);
    // formData.append('content', postData.content);
    formData.append('image', postData.image);
    // let url = 'http://localhost:8080/feed/post';
    // let method = 'POST';
    if (this.state.editPost) {
      formData.append('oldPath', this.state.editPost.imagePath);

    }
    fetch("http://localhost:8081/postimage", {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + this.props.token
      },
      body: formData,
    })
      .then(res => {
        return res.json();
      })
      .then(fileResData => {
        const imageUrl = fileResData.filePath ||'undefined';
        let graphqlqQuery = {
          query: `
      mutation createNewPost($title: String!,$content: String!,$imageUrl: String!)
      
      {
        createPost(
          postInput:{
            title:$title,
          content:$content,
          imageUrl:$imageUrl
        }){
        _id
        title
        content
        imageUrl
        creator{name}
        createdAt
        updatedAt
      }
        }
      
      `,
      variables:{
        title:postData.title,
        content:postData.content,
        imageUrl:imageUrl
      }
        };
        if (this.state.editPost) {

          graphqlqQuery = {
            query: `
        mutation updateExistingPost($id:ID!,$title: String!,$content: String!,$imageUrl: String!)

        {
          updatePost(
            id:$id
            ,postInput:{
              title:$title,
          content:$content,
          imageUrl:$imageUrl
          }){
          _id
          title
          content
          imageUrl
          creator{name}
          createdAt
          updatedAt
        }
          }
        
        `,
        variables:{
          id:this.state.editPost._id,
          title:postData.title,
          content:postData.content,
          imageUrl:imageUrl
        }
          };
        }

        return fetch("http://localhost:8080/graphql", {
          method: 'POST',
          body: JSON.stringify(graphqlqQuery),
          headers: {
            Authorization: 'Bearer ' + this.props.token,
            'Content-Type': 'application/json'
          }
        });
      })

      .then(res => {

        return res.json();
      })
      .then(resData => {
        console.log(resData);

        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error('Creating or editing a post failed!');
        }
        if (resData.errors) {
          throw new Error('Creating or editing a post failed!');
        }
        console.log(resData);
        let datafield = 'createPost';
        if (this.state.editPost) {
          datafield = 'updatePost';
        }
        const post = {
          _id: resData.data[datafield]._id,
          title: resData.data[datafield].title,
          content: resData.data[datafield].content,
          creator: resData.data[datafield].creator,
          createdAt: resData.data[datafield].createdAt,
          imagePath: resData.data[datafield].imageUrl,

        };
        this.setState(prevState => {
          let updatedPosts = [...prevState.posts];
          let updatedTotalPosts = prevState.totalPosts;
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              p => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          } else {
            updatedTotalPosts++;
            if (prevState.posts.length >= 2) {
              updatedPosts.pop();
            }
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
            totalPosts: updatedTotalPosts
          };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    const graphqlqQuery = {
      query: `
        mutation deletePost($id:ID!)
        {
        deletePost(id:$id)
    }
      `,
      variables:{
        id:postId
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      }, body: JSON.stringify(graphqlqQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        console.log(resData);

        if (resData.errors) {
          throw new Error('deleting a post failed!');
        }
        // console.log(resData);
        this.loadPosts();
        // this.setState(prevState => {
        //   const updatedPosts = prevState.posts.filter(p => p._id !== postId);
        //   return { posts: updatedPosts, postsLoading: false };
        // });
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
