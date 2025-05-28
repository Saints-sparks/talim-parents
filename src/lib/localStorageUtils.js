// utils/localStorageUtils.js (optional utility file)
export const getSchoolIdFromLocalStorage = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const userObj = JSON.parse(storedUser);
      return userObj?.user?.schoolId || null;
    } catch (error) {
      console.error("Error parsing localStorage user", error);
      return null;
    }
  };
  